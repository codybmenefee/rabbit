import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const getPrecomputedAggregation = query({
  args: {
    userId: v.string(),
    aggregationType: v.string(),
    filterHash: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject || identity.subject !== args.userId) {
      throw new Error('UNAUTHORIZED')
    }

    const record = await ctx.db
      .query('precomputed_aggregations')
      .withIndex('by_user_type', (q) =>
        q.eq('userId', args.userId).eq('aggregationType', args.aggregationType),
      )
      .filter((q) => q.eq(q.field('filterHash'), args.filterHash))
      .first()

    if (!record) {
      return null
    }

    const isExpired = record.expiresAt ? new Date(record.expiresAt) < new Date() : false
    if (isExpired) {
      return null
    }

    return record
  },
})

export const storePrecomputedAggregation = mutation({
  args: {
    userId: v.string(),
    aggregationType: v.string(),
    filterHash: v.string(),
    data: v.any(),
    computedAt: v.string(),
    expiresAt: v.string(),
    version: v.number(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject || identity.subject !== args.userId) {
      throw new Error('UNAUTHORIZED')
    }

    await ctx.db.insert('precomputed_aggregations', args)
  },
})

export const logDataChange = mutation({
  args: {
    userId: v.string(),
    changeType: v.string(),
    recordCount: v.number(),
    changedAt: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject || identity.subject !== args.userId) {
      throw new Error('UNAUTHORIZED')
    }

    await ctx.db.insert('data_change_log', {
      ...args,
      processed: false,
    })
  },
})
