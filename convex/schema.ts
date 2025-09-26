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
    metadataStatus: v.optional(v.string()),
    lastMetadataFetch: v.optional(v.string()),
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

  transcripts: defineTable({
    videoId: v.string(),
    userId: v.optional(v.string()),
    source: v.string(),
    language: v.optional(v.string()),
    status: v.string(),
    storageRef: v.optional(v.string()),
    checksum: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    metadata: v.optional(v.any()),
  })
    .index('by_video', ['videoId'])
    .index('by_user', ['userId'])
    .index('by_status', ['status']),

  ai_outputs: defineTable({
    videoId: v.string(),
    userId: v.string(),
    kind: v.string(),
    model: v.optional(v.string()),
    version: v.number(),
    storageRef: v.optional(v.string()),
    content: v.optional(v.any()),
    metadata: v.optional(v.any()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_video_kind', ['videoId', 'kind'])
    .index('by_user_kind', ['userId', 'kind'])
    .index('by_kind_version', ['kind', 'version']),

  uploaded_files: defineTable({
    userId: v.string(),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    storageRef: v.string(), // Reference to file in object storage
    status: v.string(), // 'uploaded' | 'processing' | 'completed' | 'failed'
    processingStartedAt: v.optional(v.string()),
    processingCompletedAt: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    recordCount: v.optional(v.number()),
    checksum: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_user', ['userId'])
    .index('by_status', ['status'])
    .index('by_user_status', ['userId', 'status']),

  jobs: defineTable({
    type: v.string(),
    status: v.string(),
    priority: v.number(),
    userId: v.optional(v.string()),
    videoId: v.optional(v.string()),
    fileId: v.optional(v.string()), // Reference to uploaded_files
    payload: v.optional(v.any()),
    attempts: v.number(),
    maxAttempts: v.optional(v.number()),
    scheduledFor: v.optional(v.string()),
    leaseExpiresAt: v.optional(v.string()),
    dedupeKey: v.optional(v.string()),
    lastError: v.optional(v.string()),
    result: v.optional(v.any()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index('by_status_priority', ['status', 'priority'])
    .index('by_type_status', ['type', 'status'])
    .index('by_lease', ['leaseExpiresAt'])
    .index('by_user', ['userId'])
    .index('by_file', ['fileId'])
    .index('by_dedupe', ['dedupeKey'])
    .index('by_scheduled', ['scheduledFor']),
})
