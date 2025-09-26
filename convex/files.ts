import { mutation, query } from './_generated/server'
import { v } from 'convex/values'
import { enqueueJobInternal } from './jobs'

export const uploadFile = mutation({
  args: {
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    storageRef: v.string(),
    checksum: v.optional(v.string()),
  },
  handler: async (ctx, { fileName, fileSize, mimeType, storageRef, checksum }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    const nowIso = new Date().toISOString()

    // Validate file type
    if (!mimeType.includes('html') && !fileName.toLowerCase().endsWith('.html')) {
      throw new Error('INVALID_FILE_TYPE: Only HTML files are supported')
    }

    // Check for duplicate files (same name and size)
    const existingFile = await ctx.db
      .query('uploaded_files')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => 
        q.and(
          q.eq(q.field('fileName'), fileName),
          q.eq(q.field('fileSize'), fileSize)
        )
      )
      .first()

    if (existingFile) {
      throw new Error('DUPLICATE_FILE: A file with this name and size already exists')
    }

    // Create file record
    const fileId = await ctx.db.insert('uploaded_files', {
      userId,
      fileName,
      fileSize,
      mimeType,
      storageRef,
      status: 'uploaded',
      checksum,
      createdAt: nowIso,
      updatedAt: nowIso,
    })

    // Enqueue file processing job with immediate scheduling
    await enqueueJobInternal(ctx, {
      type: 'file.process_html',
      userId,
      fileId,
      priority: 10, // High priority for file processing
      payload: { 
        reason: 'upload',
        fileName,
        fileSize,
        storageRef 
      },
      dedupeKey: `file.process_html:${fileId}`,
      scheduledFor: nowIso, // Process immediately
    })

    return { fileId }
  },
})

export const getFileStatus = query({
  args: { fileId: v.id('uploaded_files') },
  handler: async (ctx, { fileId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    const file = await ctx.db.get(fileId)
    if (!file || file.userId !== userId) {
      throw new Error('FILE_NOT_FOUND')
    }

    return file
  },
})

export const getUserFiles = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    return ctx.db
      .query('uploaded_files')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .collect()
  },
})

export const updateFileStatus = mutation({
  args: {
    fileId: v.id('uploaded_files'),
    status: v.string(),
    errorMessage: v.optional(v.string()),
    recordCount: v.optional(v.number()),
    processingStartedAt: v.optional(v.string()),
    processingCompletedAt: v.optional(v.string()),
  },
  handler: async (ctx, { fileId, status, errorMessage, recordCount, processingStartedAt, processingCompletedAt }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    const file = await ctx.db.get(fileId)
    if (!file || file.userId !== userId) {
      throw new Error('FILE_NOT_FOUND')
    }

    const updates: any = {
      status,
      updatedAt: new Date().toISOString(),
    }

    if (errorMessage !== undefined) updates.errorMessage = errorMessage
    if (recordCount !== undefined) updates.recordCount = recordCount
    if (processingStartedAt !== undefined) updates.processingStartedAt = processingStartedAt
    if (processingCompletedAt !== undefined) updates.processingCompletedAt = processingCompletedAt

    await ctx.db.patch(fileId, updates)
  },
})

export const deleteFile = mutation({
  args: { fileId: v.id('uploaded_files') },
  handler: async (ctx, { fileId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    const file = await ctx.db.get(fileId)
    if (!file || file.userId !== userId) {
      throw new Error('FILE_NOT_FOUND')
    }

    // Only allow deletion of failed or completed files
    if (!['failed', 'completed'].includes(file.status)) {
      throw new Error('CANNOT_DELETE_ACTIVE_FILE')
    }

    await ctx.db.delete(fileId)
    return { success: true }
  },
})
