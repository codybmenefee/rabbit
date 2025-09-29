import {
  WatchRecord,
  ChannelMetrics,
  KPIMetrics,
  TimeframeFilter,
  FilterOptions,
  Product
} from '@/lib/types'
import { 
  startOfMonth, 
  startOfQuarter, 
  startOfYear, 
  subMonths,
  isWithinInterval,
  format,
  getHours,
  getDay,
  parse,
  isValid,
  differenceInDays
} from 'date-fns'

const RAW_TIMESTAMP_FORMATS = [
  'MMM d, yyyy, h:mm:ss a xxx',
  'MMM d, yyyy, h:mm:ss a xx',
  'MMM d, yyyy, h:mm:ss a',
  'MMM d, yyyy, h:mm a xxx',
  'MMM d, yyyy, h:mm a',
  'MMM d yyyy, h:mm:ss a xxx',
  'MMM d yyyy, h:mm:ss a',
  'MMM d yyyy h:mm a xxx',
  'MMM d yyyy h:mm a',
  'yyyy-MM-dd HH:mm:ss',
  "yyyy-MM-dd'T'HH:mm:ss.SSSxxx",
  "yyyy-MM-dd'T'HH:mm:ssxxx",
  'yyyy/MM/dd HH:mm:ss',
  'dd.MM.yyyy, HH:mm:ss',
  'dd.MM.yyyy HH:mm:ss',
  'MM/dd/yyyy, h:mm:ss a',
  'MM/dd/yyyy h:mm:ss a',
  'dd/MM/yyyy, HH:mm:ss',
  'dd/MM/yyyy HH:mm:ss'
] as const

const watchDateCache = new WeakMap<WatchRecord, Date | null>()

function parseFlexibleTimestamp(value?: string | null): Date | null {
  if (!value) return null
  const trimmed = value.trim()
  if (!trimmed) return null

  const direct = new Date(trimmed)
  if (!Number.isNaN(direct.getTime())) {
    return direct
  }

  for (const formatString of RAW_TIMESTAMP_FORMATS) {
    try {
      const parsed = parse(trimmed, formatString, new Date())
      if (isValid(parsed)) {
        return parsed
      }
    } catch (_error) {
      // Ignore parse failures
    }
  }

  return null
}

function getWatchDate(record: WatchRecord): Date | null {
  if (watchDateCache.has(record)) {
    return watchDateCache.get(record) ?? null
  }

  const fromWatchedAt = parseFlexibleTimestamp(record.watchedAt)
  const resolved = fromWatchedAt ?? parseFlexibleTimestamp(record.watchedAt) // Fallback to same

  watchDateCache.set(record, resolved ?? null)
  return resolved ?? null
}

function resolveTimestamp(
  watchedAt?: string | null,
  startedAt?: string | null
): { isoString: string | null; date: Date | null } {
  const candidates: Array<string | null | undefined> = [watchedAt, startedAt]
  for (const candidate of candidates) {
    const parsed = parseFlexibleTimestamp(candidate)
    if (parsed) {
      return {
        isoString: parsed.toISOString(),
        date: parsed
      }
    }
  }

  return { isoString: null, date: null }
}

function applyFilters(records: WatchRecord[], filters: FilterOptions): WatchRecord[] {
  const now = new Date()
  const isWithinTimeframe = (record: WatchRecord): boolean => {
    const watchDate = getWatchDate(record)
    if (!watchDate) {
      return false
    }

    switch (filters.timeframe) {
      case 'MTD':
        return isWithinInterval(watchDate, { start: startOfMonth(now), end: now })
      case 'QTD':
        return isWithinInterval(watchDate, { start: startOfQuarter(now), end: now })
      case 'YTD':
        return isWithinInterval(watchDate, { start: startOfYear(now), end: now })
      case 'Last6M':
        return isWithinInterval(watchDate, { start: subMonths(now, 6), end: now })
      case 'Last12M':
        return isWithinInterval(watchDate, { start: subMonths(now, 12), end: now })
      case 'All':
      default:
        return true
    }
  }

  let filtered = filters.timeframe === 'All'
    ? [...records]
    : records.filter(isWithinTimeframe)

  // Apply product filter
  if (filters.product !== 'All') {
    filtered = filtered.filter(r => r.product === filters.product)
  }

  return filtered
}

export function computeKPIMetrics(records: WatchRecord[], filters: FilterOptions): KPIMetrics {
  const filtered = applyFilters(records, filters)
  const uniqueChannels = new Set(filtered.map(r => r.channelTitle).filter(Boolean)).size

  return {
    totalVideos: filtered.length,
    uniqueChannels,
    totalWatchTime: filtered.length * 300, // Basic estimate
  }
}

export function computeTopChannels(records: WatchRecord[], filters: FilterOptions, limit: number = 10): ChannelMetrics[] {
  const filtered = applyFilters(records, filters)
  const channelStats = new Map<string, { count: number }>()

  filtered.forEach(record => {
    if (!record.channelTitle) return
    
    if (!channelStats.has(record.channelTitle)) {
      channelStats.set(record.channelTitle, { count: 0 })
    }
    
    const stats = channelStats.get(record.channelTitle)!
    stats.count++
  })

  const totalVideos = filtered.length
  const sorted = Array.from(channelStats.entries())
    .map(([channel, stats]) => ({
      channel,
      videoCount: stats.count,
      watchTime: stats.count * 300, // Estimate
      percentage: totalVideos > 0 ? (stats.count / totalVideos) * 100 : 0
    }))
    .sort((a, b) => b.videoCount - a.videoCount)
    .slice(0, limit)

  return sorted
}

export function normalizeWatchRecord(
  rawData: {
    videoTitle?: string
    videoUrl?: string | null
    videoId?: string | null
    channelTitle?: string
    channelUrl?: string | null
    watchedAt?: string | null
    product?: string
    startedAt?: string | null
  },
  id?: string
): WatchRecord {
  const { isoString: resolvedWatchedAt, date } = resolveTimestamp(
    rawData.watchedAt,
    rawData.startedAt
  )

  const product: Product = rawData.product === 'YouTube Music' ? 'YouTube Music' : 'YouTube'
  const recordId = id || `${resolvedWatchedAt ?? 'missing'}-${rawData.videoUrl || 'unknown'}`
  
  return {
    id: recordId,
    watchedAt: resolvedWatchedAt,
    videoId: rawData.videoId || null,
    videoTitle: rawData.videoTitle || 'Unknown Video',
    videoUrl: rawData.videoUrl || null,
    channelTitle: rawData.channelTitle || 'Unknown Channel',
    channelUrl: rawData.channelUrl || null,
    product,
    topics: [], // Basic empty; no derive
    year: date ? date.getFullYear() : null,
    month: date ? date.getMonth() + 1 : null,
    week: date ? Math.floor((date.getDate() - 1) / 7) + 1 : null,
    dayOfWeek: date ? date.getDay() : null,
    hour: date ? date.getHours() : null,
    yoyKey: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : null,
  }
}
