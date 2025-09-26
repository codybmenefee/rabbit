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

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

void loop()
