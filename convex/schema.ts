import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  watch_events: defineTable({
    userId: v.string(),
    videoId: v.string(),
    channelTitle: v.optional(v.string()),
    channelId: v.optional(v.string()),
    startedAt: v.optional(v.string()), // ISO
    watchedSeconds: v.optional(v.number()),
    raw: v.any(),
  })
    .index('by_user', ['userId'])
    .index('by_user_time', ['userId', 'startedAt']),
})
