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
    const uniqueChannels = new Set(recent.map(e => e.channelId).filter(Boolean)).size

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
      if (!e.channelId) continue
      byChannel.set(e.channelId, (byChannel.get(e.channelId) ?? 0) + Math.round((e.watchedSeconds ?? 0) / 60))
    }
    const topChannels = Array.from(byChannel.entries())
      .sort((a,b) => b[1]-a[1])
      .slice(0,10)
      .map(([channelId, minutes], i) => ({ channelId, name: null, minutes, rank: i+1 }))

    return {
      period: `last_${lookback}d`,
      kpis: { minutesWatched, videos, uniqueChannels },
      series,
      topChannels,
    }
  }
})

// Return the user's raw records (as saved during ingest) for client aggregations
export const records = query({
  args: { limit: v.optional(v.number()), days: v.optional(v.number()) },
  handler: async (ctx, { limit, days }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    const since = days && days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null

    // Use pagination to avoid hitting the 8192 limit
    const requestedLimit = typeof limit === 'number' && Number.isFinite(limit) && limit > 0
      ? Math.floor(limit)
      : null
    const effectiveLimit = requestedLimit ? Math.min(requestedLimit, MAX_RECORDS) : MAX_RECORDS

    const events = await ctx.db
      .query('watch_events')
      .withIndex('by_user_time', q => q.eq('userId', userId))
      .order('desc')
      .take(effectiveLimit)

    const filtered = since
      ? events.filter(e => !e.startedAt || new Date(e.startedAt) >= since)
      : events

    // We persisted the original parsed record in `raw`. Return it to the client.
    // Ensure each record has a stable id; fall back to Convex _id if missing.
    return filtered.map(e => {
      const raw = (e as any).raw ?? {}
      if (!raw.id) {
        raw.id = `${e._id}`
      }
      return {
        ...raw,
        startedAt: e.startedAt
      }
    })
  }
})

export const getRecentWatchEvents = query({
  args: {
    since: v.string(),
  },
  handler: async (ctx, { since }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    return ctx.db
      .query('watch_events')
      .withIndex('by_user_time', (q) => 
        q.eq('userId', userId).gte('startedAt', since)
      )
      .collect()
  },
})

export const videoCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity?.subject) throw new Error('UNAUTHORIZED')
    const userId = identity.subject

    const events = await ctx.db
      .query('watch_events')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect()

    return { count: events.length }
  },
})
