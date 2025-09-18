import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const ingestWatchRecords = mutation({
  args: { records: v.array(v.any()) },
  handler: async (ctx, { records }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    let inserted = 0
    let skipped = 0

    for (const r of records) {
      const videoId: string | null = r.videoId ?? null
      const channelTitle: string | null = r.channelTitle ?? null
      const channelId: string | null = r.channelUrl ?? null
      const startedAt: string | null = r.watchedAt ?? null
      if (!videoId) { skipped++; continue }

      // Upsert channel
      if (channelId) {
        const existing = await ctx.db.query('channels').withIndex('by_channelId', q => q.eq('channelId', channelId)).unique()
        if (!existing) {
          await ctx.db.insert('channels', { channelId, name: channelTitle ?? undefined })
        } else if (channelTitle && !existing.name) {
          await ctx.db.patch(existing._id, { name: channelTitle })
        }
      }

      // Upsert video
      const existingVideo = await ctx.db.query('videos').withIndex('by_videoId', q => q.eq('videoId', videoId)).unique()
      if (!existingVideo) {
        await ctx.db.insert('videos', { videoId, channelId: channelId ?? undefined, title: r.videoTitle ?? undefined })
      } else {
        const patch: any = {}
        if (!existingVideo.channelId && channelId) patch.channelId = channelId
        if (!existingVideo.title && r.videoTitle) patch.title = r.videoTitle
        if (Object.keys(patch).length) await ctx.db.patch(existingVideo._id, patch)
      }

      const uniqueHash = `${videoId}:${startedAt ?? r.id}`
      const dupe = await ctx.db.query('watch_events')
        .withIndex('by_user_hash', q => q.eq('userId', userId).eq('uniqueHash', uniqueHash))
        .unique()
      if (dupe) { skipped++; continue }

      await ctx.db.insert('watch_events', {
        userId,
        videoId,
        channelId: channelId ?? undefined,
        startedAt: startedAt ?? undefined,
        watchedSeconds: undefined,
        device: undefined,
        uniqueHash,
        raw: r,
      })
      inserted++
    }

    return { inserted, skipped }
  }
})

export const clearAllUserData = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    // Delete watch events for this user
    const events = await ctx.db
      .query('watch_events')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    for (const e of events) {
      await ctx.db.delete(e._id)
    }

    // Best-effort: clean derived stats if present
    const dailies = await ctx.db
      .query('user_daily')
      .withIndex('by_user_date', q => q.eq('userId', userId))
      .collect()
    for (const d of dailies) {
      await ctx.db.delete(d._id)
    }

    const videoStats = await ctx.db
      .query('user_video_stats')
      .withIndex('by_user_video', q => q.eq('userId', userId))
      .collect()
    for (const s of videoStats) {
      await ctx.db.delete(s._id)
    }

    const channelStats = await ctx.db
      .query('user_channel_stats')
      .withIndex('by_user_channel', q => q.eq('userId', userId))
      .collect()
    for (const s of channelStats) {
      await ctx.db.delete(s._id)
    }

    return { deletedEvents: events.length }
  }
})
