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
