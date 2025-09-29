import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  uploads: defineTable({
    userId: v.string(),
    filename: v.string(),
    pathname: v.string(),
    url: v.string(),
    size: v.number(),
    uploadedAt: v.string(), // ISO
    status: v.string(), // 'pending', 'processing', 'completed', 'failed'
    processedAt: v.optional(v.string()), // ISO
    error: v.optional(v.string()),
  })
    .index('by_user', ['userId'])
    .index('by_user_status', ['userId', 'status']),

  watch_events: defineTable({
    userId: v.string(),
    videoId: v.string(),
    channelTitle: v.optional(v.string()),
    channelId: v.optional(v.string()),
    startedAt: v.optional(v.string()), // ISO
    watchedSeconds: v.optional(v.number()),
    raw: v.any(),
    uniqueHash: v.optional(v.string()), // Legacy field for existing data
  })
    .index('by_user', ['userId'])
    .index('by_user_time', ['userId', 'startedAt']),
})
