import { query } from './_generated/server'
import { v } from 'convex/values'

// Convex query results are capped at 8192 items; stay below to avoid runtime errors.
const MAX_RECORDS = 8000

function isoDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

export const status = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    const last = await ctx.db.query('watch_events')
      .withIndex('by_user_time', q => q.eq('userId', userId))
      .order('desc')
      .first()

    return { hasData: !!last, lastUpdated: last?.startedAt }
  }
})

export const summary = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, { days }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject
    const lookback = days && days > 0 ? days : 30
    const since = new Date(Date.now() - lookback * 24 * 60 * 60 * 1000)

    // Use pagination to avoid hitting the 8192 limit
    const events = await ctx.db.query('watch_events')
      .withIndex('by_user_time', q => q.eq('userId', userId))
      .order('desc')
      .take(MAX_RECORDS)

    const recent = events.filter(e => !e.startedAt || new Date(e.startedAt) >= since)

    // KPIs
    const videos = recent.length
    const minutesWatched = Math.round(recent.reduce((acc, e) => acc + ((e.watchedSeconds ?? 0) / 60), 0))
    const uniqueChannels = new Set(recent.map(e => e.channelTitle || e.channelId).filter(Boolean)).size

    // Series by day
    const byDay = new Map<string, number>()
    for (const e of recent) {
      const ts = e.startedAt ? isoDateOnly(new Date(e.startedAt)) : isoDateOnly(since)
      byDay.set(ts, (byDay.get(ts) ?? 0) + Math.round((e.watchedSeconds ?? 0) / 60))
    }
    const series = Array.from(byDay.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([date, minutes]) => ({ date, minutes }))

    // Top channels
    const byChannel = new Map<string, number>()
    for (const e of recent) {
      const channelKey = e.channelTitle || e.channelId
      if (!channelKey) continue
      byChannel.set(channelKey, (byChannel.get(channelKey) ?? 0) + Math.round((e.watchedSeconds ?? 0) / 60))
    }
    const topChannels = Array.from(byChannel.entries())
      .sort((a,b) => b[1]-a[1])
      .slice(0,10)
      .map(([channelKey, minutes], i) => ({ channelId: channelKey, name: channelKey, minutes, rank: i+1 }))

    return {
      period: `last_${lookback}d`,
      kpis: { minutesWatched, videos, uniqueChannels },
      series,
      topChannels,
    }
  }
})

// Fast dashboard metrics - server-side aggregation
export const dashboardMetrics = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    // Get total count efficiently
    const totalEvents = await ctx.db
      .query('watch_events')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    if (totalEvents.length === 0) {
      return {
        totalVideos: 0,
        uniqueChannels: 0,
        recentActivity: [],
      }
    }

    // Get unique channels
    const channelSet = new Set<string>()
    totalEvents.forEach(event => {
      if (event.channelTitle) channelSet.add(event.channelTitle)
    })

    // Get recent activity (last 30 days, optimized)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const recentEvents = totalEvents
      .filter(e => e.startedAt && new Date(e.startedAt) >= thirtyDaysAgo)
      .sort((a, b) => new Date(b.startedAt!).getTime() - new Date(a.startedAt!).getTime())
      .slice(0, 1000) // Limit for performance

    // Group by day for recent activity
    const activityByDay = new Map<string, number>()
    recentEvents.forEach(event => {
      if (event.startedAt) {
        const date = new Date(event.startedAt).toISOString().slice(0, 10)
        activityByDay.set(date, (activityByDay.get(date) ?? 0) + 1)
      }
    })

    const recentActivity = Array.from(activityByDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, videos]) => ({ date, videos }))

    return {
      totalVideos: totalEvents.length,
      uniqueChannels: channelSet.size,
      recentActivity,
    }
  }
})

// Optimized records query with better defaults
export const records = query({
  args: { limit: v.optional(v.number()), days: v.optional(v.number()) },
  handler: async (ctx, { limit, days }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    // Default to last 90 days for better performance, max 1000 records
    const defaultDays = 90
    const since = days && days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) :
                  new Date(Date.now() - defaultDays * 24 * 60 * 60 * 1000)

    const requestedLimit = typeof limit === 'number' && Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : 500 // Default smaller limit for performance
    const effectiveLimit = Math.min(requestedLimit, MAX_RECORDS)

    const events = await ctx.db
      .query('watch_events')
      .withIndex('by_user_time', q => q.eq('userId', userId))
      .order('desc')
      .take(effectiveLimit)

    const filtered = events.filter(e => !e.startedAt || new Date(e.startedAt) >= since)

    // Return raw data from the event's raw field, with stable id
    return filtered.map(e => {
      const raw = e.raw ?? {}
      if (!raw.id) {
        raw.id = `${e._id}`
      }
      return {
        ...raw,
        startedAt: e.startedAt,
        channelTitle: e.channelTitle || raw.channelTitle,
        channelId: e.channelId || raw.channelUrl,
        watchedSeconds: e.watchedSeconds,
      }
    })
  }
})
