import { action } from './_generated/server'
import { v } from 'convex/values'
import { api, internal } from './_generated/api'
import { YouTubeHistoryParser, ParsedWatchEvent } from '../lib/parser'

export const processUpload = action({
  args: {
    uploadId: v.id('uploads'),
  },
  handler: async (ctx: any, { uploadId }: { uploadId: any }): Promise<{ success: boolean; eventsProcessed: number }> => {
    // Get the upload record
    const upload = await ctx.runQuery(internal.uploads.getByIdInternal, { id: uploadId })
    if (!upload) {
      throw new Error('Upload not found')
    }

    if (upload.status !== 'pending') {
      throw new Error('Upload already processed')
    }

    try {
      // Update status to processing
      await ctx.runMutation(internal.uploads.markStatusInternal, {
        id: uploadId,
        status: 'processing',
      })

      // Fetch the file content from blob storage with streaming
      const response = await fetch(upload.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`)
      }

      if (!response.body) {
        throw new Error('Response body is not available')
      }

      // Use streaming parser for memory-efficient processing
      const parser = new YouTubeHistoryParser('')
      const eventStream = parser.parseStreaming(response.body)

      let eventsProcessed = 0
      const batchSize = 50 // Smaller batches for streaming
      let batch: ParsedWatchEvent[] = []

      // Process events as they come in from the stream
      for await (const event of eventStream) {
        batch.push(event)
        eventsProcessed++

        // Process in smaller batches to avoid overwhelming the database
        if (batch.length >= batchSize) {
          await Promise.all(
            batch.map((event: ParsedWatchEvent) =>
              ctx.runMutation(internal.watch_events.createInternal, {
                userId: upload.userId,
                videoId: event.videoId,
                channelTitle: event.channelTitle,
                channelId: event.channelId,
                startedAt: event.startedAt,
                raw: { ...event.raw, videoUrl: event.videoUrl, channelUrl: event.channelUrl },
              })
            )
          )
          batch = []
        }

        // Safety limit to prevent runaway processing
        if (eventsProcessed >= 50000) {
          break
        }
      }

      // Process remaining events in the last batch
      if (batch.length > 0) {
        await Promise.all(
          batch.map((event: ParsedWatchEvent) =>
            ctx.runMutation(internal.watch_events.createInternal, {
              userId: upload.userId,
              videoId: event.videoId,
              channelTitle: event.channelTitle,
              channelId: event.channelId,
              startedAt: event.startedAt,
              raw: { ...event.raw, videoUrl: event.videoUrl, channelUrl: event.channelUrl },
            })
          )
        )
      }

      if (eventsProcessed === 0) {
        throw new Error('No watch events found in file')
      }

      // Update status to completed
      await ctx.runMutation(internal.uploads.markStatusInternal, {
        id: uploadId,
        status: 'completed',
        processedAt: new Date().toISOString(),
      })

      return {
        success: true,
        eventsProcessed,
      }

    } catch (error) {
      console.error('Processing failed:', error)

      // Update status to failed
      await ctx.runMutation(internal.uploads.markStatusInternal, {
        id: uploadId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  },
})

// Bulk processor for cron or manual triggering
export const processPendingUploads = action({
  args: { max: v.optional(v.number()) },
  handler: async (ctx: any, { max = 5 }: { max?: number }) => {
    // Get pending uploads using internal query (admin access)
    const pendingUploads: any[] = await ctx.runQuery(internal.uploads.listPendingInternal, { limit: max })

    if (pendingUploads.length === 0) {
      return { scanned: 0, processed: 0, message: 'No pending uploads found' }
    }

    let processed = 0
    const errors = []

    for (const upload of pendingUploads) {
      if (upload.status !== 'pending') continue

      try {
        const result = await ctx.runAction(api.processing.processUpload, { uploadId: upload._id })
        processed++
        console.log(`Processed upload ${upload._id}: ${result.eventsProcessed} events`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Failed to process upload ${upload._id}:`, errorMsg)
        errors.push({ uploadId: upload._id, error: errorMsg })
      }
    }

    return {
      scanned: pendingUploads.length,
      processed,
      errors,
      message: `Processed ${processed} uploads, ${errors.length} errors`
    }
  },
})

// Reset failed uploads back to pending for reprocessing
export const resetFailedUploads = action({
  args: {},
  handler: async (ctx: any) => {
    // Get failed uploads
    const failedUploads: any[] = await ctx.runQuery(internal.uploads.listFailedInternal, { limit: 100 })

    let reset = 0
    for (const upload of failedUploads) {
      await ctx.runMutation(internal.uploads.markStatusInternal, {
        id: upload._id,
        status: 'pending',
        error: undefined, // Clear error
      })
      reset++
    }

    return {
      reset,
      message: `Reset ${reset} failed uploads back to pending status`
    }
  },
})
