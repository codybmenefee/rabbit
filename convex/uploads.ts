import { mutation, query, internalQuery, internalMutation } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    userId: v.string(),
    filename: v.string(),
    pathname: v.string(),
    url: v.string(),
    size: v.number(),
    uploadedAt: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    console.log('Uploads.create - Starting mutation')
    console.log('Uploads.create - Args userId:', args.userId)

    // Verify the user is authenticated and matches the userId
    const identity = await ctx.auth.getUserIdentity()
    console.log('Uploads.create - Convex identity:', identity)
    console.log('Uploads.create - Convex identity.subject:', identity?.subject)

    if (!identity?.subject) {
      console.log('Uploads.create - No identity.subject found')
      throw new Error('UNAUTHORIZED')
    }

    if (identity.subject !== args.userId) {
      console.log('Uploads.create - Mismatch: identity.subject !== args.userId')
      console.log('Uploads.create - identity.subject:', identity.subject)
      console.log('Uploads.create - args.userId:', args.userId)
      throw new Error('UNAUTHORIZED')
    }

    const uploadId = await ctx.db.insert('uploads', args)
    return uploadId
  },
})

export const updateStatus = mutation({
  args: {
    id: v.id('uploads'),
    status: v.string(),
    processedAt: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updateFields } = args

    // Get the upload to verify ownership
    const upload = await ctx.db.get(id)
    if (!upload) {
      throw new Error('Upload not found')
    }

    // Verify the user owns this upload
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject || identity.subject !== upload.userId) {
      throw new Error('UNAUTHORIZED')
    }

    await ctx.db.patch(id, updateFields)
  },
})

export const getByUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')

    return await ctx.db
      .query('uploads')
      .withIndex('by_user', q => q.eq('userId', identity.subject))
      .order('desc')
      .collect()
  },
})

export const getById = query({
  args: { id: v.id('uploads') },
  handler: async (ctx, { id }) => {
    const upload = await ctx.db.get(id)
    if (!upload) return null

    // Verify the user owns this upload
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject || identity.subject !== upload.userId) {
      throw new Error('UNAUTHORIZED')
    }

    return upload
  },
})

// Internal functions for admin/cron access (no user identity required)
export const listPendingInternal = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    return await ctx.db
      .query('uploads')
      .filter(q => q.eq(q.field('status'), 'pending'))
      .order('desc')
      .take(limit)
  },
})

export const listFailedInternal = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 10 }) => {
    return await ctx.db
      .query('uploads')
      .filter(q => q.eq(q.field('status'), 'failed'))
      .order('desc')
      .take(limit)
  },
})

export const markStatusInternal = internalMutation({
  args: {
    id: v.id('uploads'),
    status: v.string(),
    processedAt: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, { id, ...updateFields }) => {
    await ctx.db.patch(id, updateFields)
  },
})

export const getByIdInternal = internalQuery({
  args: { id: v.id('uploads') },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id)
  },
})
