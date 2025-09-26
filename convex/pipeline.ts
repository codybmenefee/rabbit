import { mutation, query } from './_generated/server'
import { v } from 'convex/values'

export const applyVideoMetadata = mutation({
  args: {
    videoId: v.string(),
    metadata: v.optional(v.any()),
    status: v.optional(v.string()),
    fetchedAt: v.optional(v.string()),
    durationSeconds: v.optional(v.number()),
    publishedAt: v.optional(v.string()),
    language: v.optional(v.string()),
    channelId: v.optional(v.string()),
    channelTitle: v.optional(v.string()),
    title: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { videoId, metadata, status, fetchedAt, durationSeconds, publishedAt, language, channelId, channelTitle, title },
  ) => {
    const existing = await ctx.db
      .query('videos')
      .withIndex('by_videoId', (q) => q.eq('videoId', videoId))
      .unique()

    if (!existing) {
      throw new Error('VIDEO_NOT_FOUND')
    }

    await ctx.db.patch(existing._id, {
      metadata,
      metadataStatus: status ?? 'complete',
      lastMetadataFetch: fetchedAt ?? new Date().toISOString(),
      durationSec: durationSeconds ?? existing.durationSec,
      publishedAt: publishedAt ?? existing.publishedAt,
      lang: language ?? existing.lang,
      channelId: channelId ?? existing.channelId,
      title: title ?? existing.title,
    })

    if (channelId) {
      const channel = await ctx.db
        .query('channels')
        .withIndex('by_channelId', (q) => q.eq('channelId', channelId))
        .unique()

      const thumbnailUrl =
        metadata && typeof metadata === 'object' && 'thumbnails' in (metadata as Record<string, any>)
          ? (metadata as Record<string, any>).thumbnails?.default?.url
          : undefined

      if (!channel) {
        await ctx.db.insert('channels', {
          channelId,
          name: channelTitle ?? undefined,
          thumbnailUrl: thumbnailUrl ?? undefined,
        })
      } else {
        const updates: Record<string, unknown> = {}
        if (channelTitle && !channel.name) {
          updates.name = channelTitle
        }
        if (!channel.thumbnailUrl && thumbnailUrl) {
          updates.thumbnailUrl = thumbnailUrl
        }
        if (Object.keys(updates).length) {
          await ctx.db.patch(channel._id, updates)
        }
      }
    }
  },
})

export const upsertTranscript = mutation({
  args: {
    videoId: v.string(),
    userId: v.optional(v.string()),
    source: v.string(),
    status: v.string(),
    language: v.optional(v.string()),
    storageRef: v.optional(v.string()),
    checksum: v.optional(v.string()),
    durationSec: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (
    ctx,
    { videoId, userId, source, status, language, storageRef, checksum, durationSec, failureReason, metadata },
  ) => {
    const nowIso = new Date().toISOString()
    const existing = await ctx.db
      .query('transcripts')
      .withIndex('by_video', (q) => q.eq('videoId', videoId))
      .filter((q) => q.eq(q.field('source'), source))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        status,
        storageRef,
        language,
        checksum,
        durationSec,
        failureReason,
        updatedAt: nowIso,
        userId: userId ?? existing.userId,
        metadata,
      })
      return existing._id
    }

    return ctx.db.insert('transcripts', {
      videoId,
      userId,
      source,
      status,
      storageRef,
      language,
      checksum,
      durationSec,
      failureReason,
      createdAt: nowIso,
      updatedAt: nowIso,
      metadata,
    })
  },
})

export const upsertAiOutput = mutation({
  args: {
    videoId: v.string(),
    userId: v.string(),
    kind: v.string(),
    model: v.optional(v.string()),
    version: v.number(),
    storageRef: v.optional(v.string()),
    content: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const nowIso = new Date().toISOString()
    const existing = await ctx.db
      .query('ai_outputs')
      .withIndex('by_video_kind', (q) => q.eq('videoId', args.videoId).eq('kind', args.kind))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        model: args.model,
        version: args.version,
        storageRef: args.storageRef,
        content: args.content,
        metadata: args.metadata,
        updatedAt: nowIso,
      })
      return existing._id
    }

    return ctx.db.insert('ai_outputs', {
      ...args,
      createdAt: nowIso,
      updatedAt: nowIso,
    })
  },
})

export const getTranscriptForVideo = query({
  args: {
    videoId: v.string(),
  },
  handler: async (ctx, { videoId }) => {
    return ctx.db
      .query('transcripts')
      .withIndex('by_video', (q) => q.eq('videoId', videoId))
      .first()
  },
})
