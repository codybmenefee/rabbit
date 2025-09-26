import { mutation } from './_generated/server'
import { v } from 'convex/values'
import { enqueueJobInternal } from './jobs'

export const processUploadedFile = mutation({
  args: {
    fileId: v.id('uploaded_files'),
  },
  handler: async (ctx, { fileId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    const file = await ctx.db.get(fileId)
    if (!file || file.userId !== userId) {
      throw new Error('FILE_NOT_FOUND')
    }

    if (file.status !== 'uploaded') {
      throw new Error('FILE_NOT_READY_FOR_PROCESSING')
    }

    const nowIso = new Date().toISOString()

    // Update file status to processing
    await ctx.db.patch(fileId, {
      status: 'processing',
      processingStartedAt: nowIso,
      updatedAt: nowIso,
    })

    // Enqueue the actual file processing job
    await enqueueJobInternal(ctx, {
      type: 'file.process_html',
      userId,
      fileId,
      priority: 10,
      payload: {
        fileName: file.fileName,
        fileSize: file.fileSize,
        storageRef: file.storageRef,
        mimeType: file.mimeType,
      },
      dedupeKey: `file.process_html:${fileId}`,
    })

    return { success: true }
  },
})

export const completeFileProcessing = mutation({
  args: {
    fileId: v.id('uploaded_files'),
    recordCount: v.number(),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { fileId, recordCount, errorMessage }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    const file = await ctx.db.get(fileId)
    if (!file || file.userId !== userId) {
      throw new Error('FILE_NOT_FOUND')
    }

    const nowIso = new Date().toISOString()
    const status = errorMessage ? 'failed' : 'completed'

    await ctx.db.patch(fileId, {
      status,
      processingCompletedAt: nowIso,
      recordCount: errorMessage ? undefined : recordCount,
      errorMessage,
      updatedAt: nowIso,
    })

    // If processing was successful, enqueue enrichment jobs for the new records
    if (status === 'completed' && recordCount > 0) {
      await enqueueJobInternal(ctx, {
        type: 'data.enrich_new_records',
        userId,
        fileId,
        priority: 50,
        payload: {
          reason: 'file_processing_complete',
          recordCount,
        },
        dedupeKey: `data.enrich_new_records:${fileId}`,
      })
    }

    return { success: true, status }
  },
})
