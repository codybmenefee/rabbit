import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  watch_events: defineTable({
    userId: v.string(),
    videoId: v.string(),
    channelId: v.optional(v.string()),
    startedAt: v.optional(v.string()), // ISO
    watchedSeconds: v.optional(v.number()),
    device: v.optional(v.string()),
    uniqueHash: v.string(),
    raw: v.any(),
  })
    .index('by_user', ['userId'])
    .index('by_user_time', ['userId', 'startedAt'])
    .index('by_user_hash', ['userId', 'uniqueHash']),

  videos: defineTable({
    videoId: v.string(),
    channelId: v.optional(v.string()),
    title: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    category: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
    lang: v.optional(v.string()),
    metadata: v.optional(v.any()),
  }).index('by_videoId', ['videoId']),

  channels: defineTable({
    channelId: v.string(),
    name: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
  }).index('by_channelId', ['channelId']),

  user_daily: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    minutesWatched: v.number(),
    videos: v.number(),
    uniqueChannels: v.number(),
  }).index('by_user_date', ['userId', 'date']),

  user_video_stats: defineTable({
    userId: v.string(),
    videoId: v.string(),
    views: v.number(),
    totalWatchSeconds: v.number(),
    firstWatchedAt: v.optional(v.string()),
    lastWatchedAt: v.optional(v.string()),
  }).index('by_user_video', ['userId', 'videoId']),

  user_channel_stats: defineTable({
    userId: v.string(),
    channelId: v.string(),
    views: v.number(),
    totalWatchSeconds: v.number(),
  }).index('by_user_channel', ['userId', 'channelId']),

  people: defineTable({
    name: v.string(),
    alias: v.optional(v.array(v.string())),
    createdAt: v.string(),
  }).index('by_name', ['name']),

  video_people: defineTable({
    videoId: v.string(),
    personId: v.string(),
    confidence: v.optional(v.number()),
    method: v.optional(v.string()),
  }).index('by_video', ['videoId']).index('by_person', ['personId']),

  llm_runs: defineTable({
    userId: v.string(),
    runType: v.string(),
    inputFingerprint: v.optional(v.string()),
    model: v.optional(v.string()),
    args: v.optional(v.any()),
    startedAt: v.string(),
    finishedAt: v.optional(v.string()),
    status: v.optional(v.string()),
    costCents: v.optional(v.number()),
  }).index('by_user_type', ['userId', 'runType']),

  llm_outputs: defineTable({
    runId: v.string(),
    outputType: v.string(),
    contentText: v.optional(v.string()),
    contentJson: v.optional(v.any()),
  }).index('by_run', ['runId']),

  precomputed_aggregations: defineTable({
    userId: v.string(),
    aggregationType: v.string(),
    filterHash: v.string(),
    data: v.any(),
    computedAt: v.string(),
    expiresAt: v.string(),
    version: v.number(),
    metadata: v.optional(v.any()),
  })
    .index('by_user_type', ['userId', 'aggregationType'])
    .index('by_filter_hash', ['filterHash'])
    .index('by_expires', ['expiresAt']),

  data_change_log: defineTable({
    userId: v.string(),
    changeType: v.string(),
    recordCount: v.number(),
    changedAt: v.string(),
    processed: v.boolean(),
  })
    .index('by_user_processed', ['userId', 'processed'])
    .index('by_changed_at', ['changedAt']),
})

