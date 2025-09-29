import { mutation, query, internalMutation } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    userId: v.string(),
    videoId: v.string(),
    channelTitle: v.optional(v.string()),
    channelId: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    watchedSeconds: v.optional(v.number()),
    raw: v.any(),
    uniqueHash: v.optional(v.string()), // Legacy field for existing data
  },
  handler: async (ctx, args) => {
    // Verify the user is authenticated and matches the userId
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject || identity.subject !== args.userId) {
      throw new Error('UNAUTHORIZED')
    }

    const eventId = await ctx.db.insert('watch_events', args)
    return eventId
  },
})

// Internal function for admin/cron access (no user identity required)
export const createInternal = internalMutation({
  args: {
    userId: v.string(),
    videoId: v.string(),
    channelTitle: v.optional(v.string()),
    channelId: v.optional(v.string()),
    startedAt: v.optional(v.string()),
    watchedSeconds: v.optional(v.number()),
    raw: v.any(),
    uniqueHash: v.optional(v.string()), // Legacy field for existing data
  },
  handler: async (ctx, args) => {
    // Skip authentication check for internal calls
    const eventId = await ctx.db.insert('watch_events', args)
    return eventId
  },
})
