import 'dotenv/config'
import { ConvexHttpClient } from 'convex/browser'
import { parse as parseIsoDuration } from 'iso8601-duration'

const CONVEX_URL = process.env.CONVEX_URL
const CONVEX_SERVICE_TOKEN = process.env.CONVEX_SERVICE_TOKEN
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY ?? null
const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? null
const LOOP_INTERVAL_MS = Number(process.env.WORKER_IDLE_MS ?? 2000)

if (!CONVEX_URL) {
  throw new Error('Missing CONVEX_URL environment variable')
}
if (!CONVEX_SERVICE_TOKEN) {
  throw new Error('Missing CONVEX_SERVICE_TOKEN environment variable')
}

const client = new ConvexHttpClient(CONVEX_URL)
client.setAdminAuth(CONVEX_SERVICE_TOKEN)

type JobLease = {
  _id: string
  type: string
  userId?: string
  videoId?: string
  payload?: Record<string, unknown>
  attempts: number
  maxAttempts?: number
  leaseExpiresAt?: string
  priority: number
}

type JobHandler = (job: JobLease) => Promise<void>

const handlers: Record<string, JobHandler> = {
  'video.fetch_metadata': handleFetchMetadata,
  'video.ensure_transcript': handleEnsureTranscript,
  'video.generate_summary': handleGenerateSummary,
  'file.process_html': handleProcessHtmlFile,
  'data.enrich_new_records': handleEnrichNewRecords,
}

async function leaseJob(): Promise<JobLease | null> {
  return client.mutation('jobs:leaseNext', {
    types: Object.keys(handlers),
    includeScheduled: true,
    leaseMs: 5 * 60 * 1000,
    limit: 50,
  })
}

async function completeJob(jobId: string, result?: Record<string, unknown>) {
  await client.mutation('jobs:complete', { jobId, result })
}

async function failJob(
  jobId: string,
  error: string,
  { allowRetry = true, retryBackoffMs }: { allowRetry?: boolean; retryBackoffMs?: number } = {},
) {
  await client.mutation('jobs:fail', {
    jobId,
    error,
    allowRetry,
    retryBackoffMs,
  })
}

async function handleFetchMetadata(job: JobLease) {
  const videoId = job.videoId
  if (!videoId) {
    await failJob(job._id, 'MISSING_VIDEO_ID', { allowRetry: false })
    return
  }

  if (!YOUTUBE_API_KEY) {
    await failJob(job._id, 'MISSING_YOUTUBE_API_KEY', { allowRetry: false })
    return
  }

  const apiUrl = new URL('https://www.googleapis.com/youtube/v3/videos')
  apiUrl.searchParams.set('part', 'snippet,contentDetails')
  apiUrl.searchParams.set('id', videoId)
  apiUrl.searchParams.set('key', YOUTUBE_API_KEY)

  const response = await fetch(apiUrl)
  if (!response.ok) {
    const body = await response.text()
    await failJob(job._id, `YOUTUBE_METADATA_ERROR: ${response.status} ${body}`)
    return
  }

  const data = (await response.json()) as any
  if (!data.items?.length) {
    await failJob(job._id, 'YOUTUBE_METADATA_NOT_FOUND', { allowRetry: false })
    return
  }

  const item = data.items[0]
  const snippet = item.snippet ?? {}
  const details = item.contentDetails ?? {}
  const durationIso = details.duration ?? null
  const durationSeconds = durationIso ? toSeconds(durationIso) : undefined

  await client.mutation('pipeline:applyVideoMetadata', {
    videoId,
    metadata: item,
    status: 'complete',
    fetchedAt: new Date().toISOString(),
    durationSeconds,
    publishedAt: snippet.publishedAt ?? undefined,
    language: snippet.defaultAudioLanguage ?? snippet.defaultLanguage ?? undefined,
    channelId: snippet.channelId ?? undefined,
    channelTitle: snippet.channelTitle ?? undefined,
    title: snippet.title ?? undefined,
  })

  await completeJob(job._id, { status: 'ok', source: 'youtube' })
}

async function handleEnsureTranscript(job: JobLease) {
  const videoId = job.videoId
  if (!videoId) {
    await failJob(job._id, 'MISSING_VIDEO_ID', { allowRetry: false })
    return
  }

  if (!job.userId) {
    await failJob(job._id, 'MISSING_USER_ID', { allowRetry: false })
    return
  }

  // Marks transcript as skipped until a transcription provider is configured.
  await client.mutation('pipeline:upsertTranscript', {
    videoId,
    userId: job.userId,
    source: 'external',
    status: 'skipped',
    failureReason: 'No transcription provider configured',
    metadata: { configured: false },
  })

  await completeJob(job._id, { status: 'skipped' })
}

async function handleGenerateSummary(job: JobLease) {
  const videoId = job.videoId
  if (!videoId) {
    await failJob(job._id, 'MISSING_VIDEO_ID', { allowRetry: false })
    return
  }

  if (!job.userId) {
    await failJob(job._id, 'MISSING_USER_ID', { allowRetry: false })
    return
  }

  if (!OPENAI_API_KEY) {
    await client.mutation('pipeline:upsertAiOutput', {
      videoId,
      userId: job.userId,
      kind: 'summary.basic',
      model: undefined,
      version: 1,
      content: undefined,
      metadata: { status: 'skipped', reason: 'missing_openai_api_key' },
    })
    await completeJob(job._id, { status: 'skipped' })
    return
  }

  const transcript = await client.query('pipeline:getTranscriptForVideo', { videoId })
  if (!transcript) {
    await failJob(job._id, 'TRANSCRIPT_NOT_READY', {
      retryBackoffMs: 5 * 60 * 1000,
    })
    return
  }

  if (transcript.status === 'skipped' || transcript.status === 'failed') {
    await client.mutation('pipeline:upsertAiOutput', {
      videoId,
      userId: job.userId,
      kind: 'summary.basic',
      model: undefined,
      version: 1,
      content: undefined,
      metadata: { status: transcript.status, source: transcript.source },
    })
    await completeJob(job._id, { status: 'skipped_transcript' })
    return
  }

  if (transcript.status !== 'ready') {
    await failJob(job._id, 'TRANSCRIPT_NOT_READY', {
      retryBackoffMs: 5 * 60 * 1000,
    })
    return
  }

  const prompt = buildSummaryPrompt(transcript)
  const completion = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SUMMARY_MODEL ?? 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an assistant that writes concise video summaries.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 512,
    }),
  })

  if (!completion.ok) {
    const body = await completion.text()
    await failJob(job._id, `OPENAI_ERROR: ${completion.status} ${body}`)
    return
  }

  const completionPayload = (await completion.json()) as any
  const message = completionPayload.choices?.[0]?.message?.content?.trim()
  if (!message) {
    await failJob(job._id, 'OPENAI_EMPTY_RESPONSE', { allowRetry: false })
    return
  }

  await client.mutation('pipeline:upsertAiOutput', {
    videoId,
    userId: job.userId,
    kind: 'summary.basic',
    model: completionPayload.model,
    version: 1,
    content: { summary: message },
    metadata: {
      provider: 'openai',
      createdAt: new Date().toISOString(),
    },
  })

  await completeJob(job._id, { status: 'ok', provider: 'openai' })
}

async function handleProcessHtmlFile(job: JobLease) {
  const fileId = job.fileId
  if (!fileId) {
    await failJob(job._id, 'MISSING_FILE_ID', { allowRetry: false })
    return
  }

  if (!job.userId) {
    await failJob(job._id, 'MISSING_USER_ID', { allowRetry: false })
    return
  }

  const payload = job.payload as any
  if (!payload?.storageRef) {
    await failJob(job._id, 'MISSING_STORAGE_REF', { allowRetry: false })
    return
  }

  try {
    // Download file from storage
    const fileContent = await downloadFromStorage(payload.storageRef)
    if (!fileContent) {
      await failJob(job._id, 'FILE_DOWNLOAD_FAILED', { allowRetry: true })
      return
    }

    // Parse HTML content
    const { YouTubeHistoryParser } = await import('../../lib/parser')
    const parser = new YouTubeHistoryParser()
    const records = await parser.parseHTML(fileContent)

    if (records.length === 0) {
      await client.mutation('fileProcessor:completeFileProcessing', {
        fileId,
        recordCount: 0,
        errorMessage: 'No valid video records found in HTML file',
      })
      await completeJob(job._id, { status: 'completed', recordCount: 0 })
      return
    }

    // Ingest records in chunks
    const CHUNK_SIZE = 100
    let totalInserted = 0

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      const chunk = records.slice(i, i + CHUNK_SIZE)
      const result = await client.mutation('ingest:ingestWatchRecords', {
        records: chunk,
      })
      totalInserted += result.inserted
    }

    // Mark file processing as complete
    await client.mutation('fileProcessor:completeFileProcessing', {
      fileId,
      recordCount: totalInserted,
    })

    await completeJob(job._id, { 
      status: 'completed', 
      recordCount: totalInserted,
      fileName: payload.fileName 
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error'
    
    await client.mutation('fileProcessor:completeFileProcessing', {
      fileId,
      recordCount: 0,
      errorMessage,
    })

    await failJob(job._id, `PROCESSING_ERROR: ${errorMessage}`, { allowRetry: false })
  }
}

async function handleEnrichNewRecords(job: JobLease) {
  const fileId = job.fileId
  if (!fileId) {
    await failJob(job._id, 'MISSING_FILE_ID', { allowRetry: false })
    return
  }

  if (!job.userId) {
    await failJob(job._id, 'MISSING_USER_ID', { allowRetry: false })
    return
  }

  try {
    // Get recent watch events for this user (from the last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const recentEvents = await client.query('dashboard:getRecentWatchEvents', {
      since: oneHourAgo,
    })

    if (!recentEvents || recentEvents.length === 0) {
      await completeJob(job._id, { status: 'skipped', reason: 'no_recent_events' })
      return
    }

    // Enqueue metadata and transcript jobs for new videos
    let enrichmentJobs = 0
    for (const event of recentEvents) {
      if (!event.videoId) continue

      // Enqueue metadata fetch
      await client.mutation('jobs:enqueue', {
        type: 'video.fetch_metadata',
        userId: job.userId,
        videoId: event.videoId,
        priority: 50,
        payload: { reason: 'file_processing_enrichment' },
        dedupeKey: `video.fetch_metadata:${event.videoId}`,
      })

      // Enqueue transcript processing
      await client.mutation('jobs:enqueue', {
        type: 'video.ensure_transcript',
        userId: job.userId,
        videoId: event.videoId,
        priority: 100,
        payload: { reason: 'file_processing_enrichment' },
        dedupeKey: `video.ensure_transcript:${event.videoId}`,
      })

      enrichmentJobs += 2
    }

    await completeJob(job._id, { 
      status: 'completed', 
      enrichmentJobs,
      videosProcessed: recentEvents.length 
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown enrichment error'
    await failJob(job._id, `ENRICHMENT_ERROR: ${errorMessage}`, { allowRetry: true })
  }
}

function buildSummaryPrompt(transcript: any): string {
  const body = transcript?.metadata?.text ?? transcript?.content ?? ''
  return [
    'Summarise the following YouTube transcript in bullet points.',
    'Include key themes, notable moments, and audience takeaways.',
    'Keep the summary under 120 words.',
    '',
    body.slice(0, 5000),
  ].join('\n')
}

function toSeconds(duration: string): number | undefined {
  try {
    const parsed = parseIsoDuration(duration)
    return (
      (parsed.years ?? 0) * 31536000 +
      (parsed.months ?? 0) * 2628000 +
      (parsed.days ?? 0) * 86400 +
      (parsed.hours ?? 0) * 3600 +
      (parsed.minutes ?? 0) * 60 +
      (parsed.seconds ?? 0)
    )
  } catch (error) {
    console.warn('Failed to parse video duration', error)
    return undefined
  }
}

async function loop() {
  while (true) {
    try {
      const job = await leaseJob()
      if (!job) {
        await delay(LOOP_INTERVAL_MS)
        continue
      }

      const handler = handlers[job.type]
      if (!handler) {
        await failJob(job._id, `UNSUPPORTED_JOB_TYPE:${job.type}`, { allowRetry: false })
        continue
      }

      await handler(job)
    } catch (error) {
      console.error('Worker loop error', error)
      await delay(LOOP_INTERVAL_MS)
    }
  }
}

async function downloadFromStorage(storageRef: string): Promise<string | null> {
  try {
    // Download from Vercel Blob using the pathname
    const blobUrl = `https://blob.vercel-storage.com${storageRef}`
    
    const response = await fetch(blobUrl)
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`)
    }
    
    const content = await response.text()
    return content
    
  } catch (error) {
    console.error('Failed to download file from Vercel Blob:', error)
    return null
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

void loop()
