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

      // Fetch the file content from blob storage
      const response = await fetch(upload.url)
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`)
      }

      const html = await response.text()

      // Parse the HTML
      const parser = new YouTubeHistoryParser(html)
      const events = await parser.parse()

      if (events.length === 0) {
        throw new Error('No watch events found in file')
      }

      // Create watch events in batches to avoid timeouts
      const batchSize = 100
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize)

        await Promise.all(
          batch.map((event: ParsedWatchEvent) =>
            ctx.runMutation(api.watch_events.create, {
              userId: upload.userId,
              ...event,
            })
          )
        )
      }

      // Update status to completed
      await ctx.runMutation(api.uploads.updateStatus, {
        id: uploadId,
        status: 'completed',
        processedAt: new Date().toISOString(),
      })

      return {
        success: true,
        eventsProcessed: events.length,
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
