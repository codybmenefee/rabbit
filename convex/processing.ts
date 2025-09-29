import { action } from './_generated/server'
import { v } from 'convex/values'
import { api } from './_generated/api'
import { YouTubeHistoryParser, ParsedWatchEvent } from '../lib/parser'

export const processUpload = action({
  args: {
    uploadId: v.id('uploads'),
  },
  handler: async (ctx: any, { uploadId }: { uploadId: any }): Promise<{ success: boolean; eventsProcessed: number }> => {
    // Get the upload record
    const upload = await ctx.runQuery(api.uploads.getById, { id: uploadId })
    if (!upload) {
      throw new Error('Upload not found')
    }

    if (upload.status !== 'pending') {
      throw new Error('Upload already processed')
    }

    try {
      // Update status to processing
      await ctx.runMutation(api.uploads.updateStatus, {
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
              ctx.runMutation(api.watch_events.create, {
                userId: upload.userId,
                ...event,
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
            ctx.runMutation(api.watch_events.create, {
              userId: upload.userId,
              ...event,
            })
          )
        )
      }

      if (eventsProcessed === 0) {
        throw new Error('No watch events found in file')
      }

      // Update status to completed
      await ctx.runMutation(api.uploads.updateStatus, {
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
      await ctx.runMutation(api.uploads.updateStatus, {
        id: uploadId,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      })

      throw error
    }
  },
})
