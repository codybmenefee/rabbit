import {
  WatchRecord,
  ChannelMetrics,
  MonthlyCount,
  DayHourMatrix,
  TopicCount,
  KPIMetrics,
  TimeframeFilter,
  FilterOptions,
  AggregationResult,
  Product
} from '@/types/records'
import { 
  startOfMonth, 
  startOfQuarter, 
  startOfYear, 
  subMonths,
  subYears,
  isWithinInterval,
  format,
  getHours,
  getDay,
  parse,
  isValid,
  differenceInMinutes,
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
      // Ignore parse failures for individual patterns
    }
  }

  return null
}

function getWatchDate(record: WatchRecord): Date | null {
  if (watchDateCache.has(record)) {
    return watchDateCache.get(record) ?? null
  }

  const fromWatchedAt = parseFlexibleTimestamp(record.watchedAt)
  const resolved = fromWatchedAt ?? parseFlexibleTimestamp(record.rawTimestamp)

  watchDateCache.set(record, resolved ?? null)
  return resolved ?? null
}

function resolveTimestamp(
  watchedAt?: string | null,
  rawTimestamp?: string | null,
  startedAt?: string | null
): { isoString: string | null; date: Date | null } {
  const candidates: Array<string | null | undefined> = [watchedAt, rawTimestamp, startedAt]
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

  // Apply topic filter
  if (filters.topics && filters.topics.length > 0) {
    filtered = filtered.filter(r => 
      r.topics.some(topic => filters.topics?.includes(topic))
    )
  }

  // Apply channel filter
  if (filters.channels && filters.channels.length > 0) {
    filtered = filtered.filter(r => 
      r.channelTitle && filters.channels?.includes(r.channelTitle)
    )
  }
  return filtered
}

export function computeKPIMetrics(records: WatchRecord[], filters: FilterOptions): KPIMetrics {
  const now = new Date()

  const datedRecords = records.reduce<Array<{ record: WatchRecord; watchDate: Date }>>((acc, record) => {
    const watchDate = getWatchDate(record)
    if (watchDate) {
      acc.push({ record, watchDate })
    }
    return acc
  }, [])

  const ytdRecords = datedRecords.filter(({ watchDate }) =>
    isWithinInterval(watchDate, { start: startOfYear(now), end: now })
  )

  const qtdRecords = datedRecords.filter(({ watchDate }) =>
    isWithinInterval(watchDate, { start: startOfQuarter(now), end: now })
  )

  const mtdRecords = datedRecords.filter(({ watchDate }) =>
    isWithinInterval(watchDate, { start: startOfMonth(now), end: now })
  )

  const lastYear = subYears(now, 1)
  const lastYearEnd = new Date(
    lastYear.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds()
  )

  const lastYearYtd = datedRecords.filter(({ watchDate }) =>
    isWithinInterval(watchDate, { start: startOfYear(lastYear), end: lastYearEnd })
  )

  const lastYearQtd = datedRecords.filter(({ watchDate }) =>
    isWithinInterval(watchDate, { start: startOfQuarter(lastYear), end: lastYearEnd })
  )

  const lastYearMtd = datedRecords.filter(({ watchDate }) =>
    isWithinInterval(watchDate, { start: startOfMonth(lastYear), end: lastYearEnd })
  )

  const filtered = applyFilters(records, filters)
  const uniqueChannels = new Set(filtered.map(r => r.channelTitle).filter(Boolean)).size

  return {
    totalVideos: filtered.length,
    uniqueChannels,
    totalWatchTime: filtered.length * 300, // Estimate since we don't have duration
    ytdVideos: ytdRecords.length,
    qtdVideos: qtdRecords.length,
    mtdVideos: mtdRecords.length,
    ytdYoyDelta: calculatePercentageChange(ytdRecords.length, lastYearYtd.length),
    qtdYoyDelta: calculatePercentageChange(qtdRecords.length, lastYearQtd.length),
    mtdYoyDelta: calculatePercentageChange(mtdRecords.length, lastYearMtd.length)
  }
}

export function computeMonthlyTrend(records: WatchRecord[], filters: FilterOptions): MonthlyCount[] {
  const filtered = applyFilters(records, filters)
  const monthlyData = new Map<string, { videos: Set<string>, channels: Set<string> }>()

  filtered.forEach(record => {
    const watchDate = getWatchDate(record)
    if (!watchDate) return

    const monthKey = format(watchDate, 'yyyy-MM')
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, { 
        videos: new Set(), 
        channels: new Set() 
      })
    }

    const data = monthlyData.get(monthKey)!
    data.videos.add(record.id)
    if (record.channelTitle) {
      data.channels.add(record.channelTitle)
    }
  })

  return Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month: format(new Date(month + '-01'), 'MMM yyyy'),
      videos: data.videos.size,
      watchTime: data.videos.size * 300, // Estimate
      uniqueChannels: data.channels.size
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
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
      percentage: (stats.count / totalVideos) * 100
    }))
    .sort((a, b) => b.videoCount - a.videoCount)
    .slice(0, limit)

  return sorted
}

export function computeDayTimeHeatmap(records: WatchRecord[], filters: FilterOptions): DayHourMatrix[] {
  const filtered = applyFilters(records, filters)
  const heatmapData: number[][] = Array(7).fill(null).map(() => Array(24).fill(0))
  
  filtered.forEach(record => {
    const watchDate = getWatchDate(record)
    if (!watchDate) return

    const day = getDay(watchDate)
    const hour = getHours(watchDate)
    heatmapData[day][hour]++
  })

  const result: DayHourMatrix[] = []
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      result.push({
        day: days[day],
        hour,
        value: heatmapData[day][hour]
      })
    }
  }

  return result
}

export function computeTopicsLeaderboard(records: WatchRecord[], filters: FilterOptions): TopicCount[] {
  const filtered = applyFilters(records, filters)
  const topicCounts = new Map<string, number>()
  
  // Count topics from the topics array
  filtered.forEach(record => {
    record.topics.forEach(topic => {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
    })
  })

  // Calculate previous period for trend
  const now = new Date()
  const previousPeriod = records.filter(r => {
    const watchDate = getWatchDate(r)
    if (!watchDate) return false
    return isWithinInterval(watchDate, { 
      start: subMonths(now, 2), 
      end: subMonths(now, 1) 
    })
  })
  
  const previousTopicCounts = new Map<string, number>()
  previousPeriod.forEach(record => {
    record.topics.forEach(topic => {
      previousTopicCounts.set(topic, (previousTopicCounts.get(topic) || 0) + 1)
    })
  })

  const total = Array.from(topicCounts.values()).reduce((sum, count) => sum + count, 0)
  
  return Array.from(topicCounts.entries())
    .map(([topic, count]) => {
      const previousCount = previousTopicCounts.get(topic) || 0
      let trend: 'up' | 'down' | 'stable' = 'stable'
      
      if (count > previousCount * 1.1) trend = 'up'
      else if (count < previousCount * 0.9) trend = 'down'
      
      return {
        topic,
        count,
        trend,
        percentage: total > 0 ? (count / total) * 100 : 0
      }
    })
    .sort((a, b) => b.count - a.count)
}

function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

export function deriveTopics(title: string, channel: string): string[] {
  const topics: string[] = []
  const text = `${title} ${channel}`.toLowerCase()
  
  const topicPatterns: Record<string, RegExp[]> = {
    'Technology': [
      /\b(tech|software|hardware|coding|programming|developer|javascript|python|react|node|api|app|mobile|web|ai|machine learning|ml|data|database|cloud|aws|azure|devops|kubernetes|docker)\b/i
    ],
    'Finance': [
      /\b(finance|money|invest|stock|crypto|bitcoin|ethereum|trading|market|economy|business|startup|entrepreneur|wealth|financial|bank)\b/i
    ],
    'Politics': [
      /\b(politic|election|government|president|congress|senate|democrat|republican|policy|vote|campaign|liberal|conservative)\b/i
    ],
    'Entertainment': [
      /\b(movie|film|tv|show|series|netflix|disney|marvel|actor|actress|celebrity|drama|comedy|entertainment)\b/i
    ],
    'Education': [
      /\b(learn|education|tutorial|course|lesson|teach|study|university|college|school|academic|research|science|math|history)\b/i
    ],
    'Gaming': [
      /\b(game|gaming|gamer|playstation|xbox|nintendo|steam|esports|minecraft|fortnite|valorant|league|overwatch|rpg|fps)\b/i
    ],
    'Music': [
      /\b(music|song|album|artist|band|concert|spotify|hip hop|rap|rock|pop|jazz|classical|electronic|dj|producer)\b/i
    ],
    'Sports': [
      /\b(sport|football|basketball|baseball|soccer|tennis|golf|nfl|nba|mlb|fifa|olympics|athlete|team|championship)\b/i
    ],
    'News': [
      /\b(news|breaking|update|report|journalist|media|press|headline|story|coverage|current events)\b/i
    ],
    'Science': [
      /\b(science|physics|chemistry|biology|research|experiment|discovery|space|nasa|quantum|evolution|climate)\b/i
    ],
    'Cooking': [
      /\b(cook|recipe|food|meal|kitchen|chef|bake|cuisine|restaurant|eat|dish|ingredient|culinary)\b/i
    ],
    'Travel': [
      /\b(travel|trip|vacation|tourist|destination|hotel|flight|adventure|explore|country|city|beach|mountain)\b/i
    ]
  }
  
  for (const [topic, patterns] of Object.entries(topicPatterns)) {
    if (patterns.some(pattern => pattern.test(text))) {
      topics.push(topic)
    }
  }
  
  if (topics.length === 0) {
    topics.push('Other')
  }
  
  return topics
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
    rawTimestamp?: string
    startedAt?: string | null
  },
  id?: string
): WatchRecord {
  const { isoString: resolvedWatchedAt, date } = resolveTimestamp(
    rawData.watchedAt,
    rawData.rawTimestamp ?? null,
    rawData.startedAt ?? null
  )

  const topics = deriveTopics(
    rawData.videoTitle || '',
    rawData.channelTitle || ''
  )
  
  const product: Product = rawData.product === 'YouTube Music' ? 'YouTube Music' : 'YouTube'
  const idSeed = rawData.videoUrl || rawData.videoTitle || 'unknown'
  const recordId = id || `${resolvedWatchedAt ?? 'missing-date'}-${idSeed}`
  
  return {
    id: recordId,
    watchedAt: resolvedWatchedAt,
    videoId: rawData.videoId || null,
    videoTitle: rawData.videoTitle || 'Unknown Video',
    videoUrl: rawData.videoUrl || null,
    channelTitle: rawData.channelTitle || 'Unknown Channel',
    channelUrl: rawData.channelUrl || null,
    product,
    topics,
    year: date ? date.getFullYear() : null,
    month: date ? date.getMonth() + 1 : null,
    week: date ? Math.floor((date.getDate() - 1) / 7) + 1 : null,
    dayOfWeek: date ? date.getDay() : null,
    hour: date ? date.getHours() : null,
    yoyKey: date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : null,
    rawTimestamp: rawData.rawTimestamp
  }
}

// Enhanced aggregation functions for History page

export function computeHistoryAnalytics(records: WatchRecord[]) {
  const datedRecords = records.reduce<Array<{ record: WatchRecord; watchDate: Date }>>((acc, record) => {
    const watchDate = getWatchDate(record)
    if (watchDate) {
      acc.push({ record, watchDate })
    }
    return acc
  }, [])

  if (datedRecords.length === 0) {
    return {
      totalVideos: 0,
      uniqueChannels: 0,
      totalDays: 0,
      avgVideosPerDay: 0,
      dateRange: { start: null, end: null }
    }
  }

  // Calculate date range
  const dates = datedRecords
    .map(entry => entry.watchDate)
    .sort((a, b) => a.getTime() - b.getTime())
  
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]
  const totalDays = differenceInDays(endDate, startDate) + 1
  
  // Calculate unique metrics
  const uniqueChannels = new Set(
    datedRecords.map(entry => entry.record.channelTitle).filter(Boolean)
  ).size

  return {
    totalVideos: datedRecords.length,
    uniqueChannels,
    totalDays,
    avgVideosPerDay: totalDays > 0 ? (datedRecords.length / totalDays) : 0,
    dateRange: { start: startDate, end: endDate }
  }
}

export function computeSessionAnalysis(records: WatchRecord[]) {
  const datedRecords = records
    .reduce<Array<{ record: WatchRecord; watchDate: Date }>>((acc, record) => {
      const watchDate = getWatchDate(record)
      if (watchDate) {
        acc.push({ record, watchDate })
      }
      return acc
    }, [])
    .sort((a, b) => a.watchDate.getTime() - b.watchDate.getTime())

  if (datedRecords.length === 0) {
    return {
      sessions: [],
      totalSessions: 0,
      avgSessionLength: 0,
      avgVideosPerSession: 0
    }
  }

  // Define session break threshold (30 minutes)
  const SESSION_BREAK_MINUTES = 30
  const sessions: Array<{
    id: string
    startTime: string
    endTime: string
    videos: WatchRecord[]
    duration: number
    avgGapMinutes: number
  }> = []

  let currentSession: Array<{ record: WatchRecord; watchDate: Date }> = [datedRecords[0]]

  const pushSession = (entries: Array<{ record: WatchRecord; watchDate: Date }>) => {
    const sessionIndex = sessions.length + 1
    const sessionStart = entries[0].watchDate
    const sessionEnd = entries[entries.length - 1].watchDate
    const duration = differenceInMinutes(sessionEnd, sessionStart)

    let totalGap = 0
    for (let j = 1; j < entries.length; j++) {
      totalGap += differenceInMinutes(entries[j].watchDate, entries[j - 1].watchDate)
    }

    sessions.push({
      id: `session-${sessionIndex}`,
      startTime: entries[0].record.watchedAt ?? sessionStart.toISOString(),
      endTime: entries[entries.length - 1].record.watchedAt ?? sessionEnd.toISOString(),
      videos: entries.map(entry => entry.record),
      duration,
      avgGapMinutes: entries.length > 1 ? totalGap / (entries.length - 1) : 0
    })
  }

  for (let i = 1; i < datedRecords.length; i++) {
    const currentTime = datedRecords[i].watchDate
    const lastTime = datedRecords[i - 1].watchDate
    const gapMinutes = differenceInMinutes(currentTime, lastTime)
    
    if (gapMinutes > SESSION_BREAK_MINUTES) {
      // End current session and start new one
      if (currentSession.length > 0) {
        pushSession(currentSession)
      }
      
      currentSession = [datedRecords[i]]
    } else {
      currentSession.push(datedRecords[i])
    }
  }
  
  // Add the final session
  if (currentSession.length > 0) {
    pushSession(currentSession)
  }

  // Calculate session statistics
  const totalSessions = sessions.length
  const avgSessionLength = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length 
    : 0
  const avgVideosPerSession = sessions.length > 0
    ? sessions.reduce((sum, s) => sum + s.videos.length, 0) / sessions.length
    : 0

  return {
    sessions,
    totalSessions,
    avgSessionLength,
    avgVideosPerSession
  }
}

export function computeViewingPatterns(records: WatchRecord[]) {
  const validRecords = records.filter(r => r.watchedAt !== null)
  
  if (validRecords.length === 0) {
    return {
      hourlyDistribution: [],
      dailyDistribution: [],
      weeklyDistribution: [],
      monthlyDistribution: []
    }
  }

  // Hourly distribution
  const hourlyStats = Array(24).fill(0)
  validRecords.forEach(record => {
    if (record.hour !== null) {
      hourlyStats[record.hour]++
    }
  })

  const hourlyDistribution = hourlyStats.map((count, hour) => ({
    hour,
    count,
    percentage: (count / validRecords.length) * 100
  }))

  // Daily distribution (0 = Sunday, 6 = Saturday)
  const dailyStats = Array(7).fill(0)
  validRecords.forEach(record => {
    if (record.dayOfWeek !== null) {
      dailyStats[record.dayOfWeek]++
    }
  })

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dailyDistribution = dailyStats.map((count, day) => ({
    day: dayNames[day],
    dayNum: day,
    count,
    percentage: (count / validRecords.length) * 100
  }))

  // Weekly patterns (by week of month)
  const weeklyStats = Array(6).fill(0) // Up to 6 weeks in a month
  validRecords.forEach(record => {
    if (record.week !== null && record.week >= 1 && record.week <= 6) {
      weeklyStats[record.week - 1]++
    }
  })

  const weeklyDistribution = weeklyStats.map((count, week) => ({
    week: week + 1,
    count,
    percentage: (count / validRecords.length) * 100
  }))

  // Monthly distribution
  const monthlyStats = Array(12).fill(0)
  validRecords.forEach(record => {
    if (record.month !== null && record.month >= 1 && record.month <= 12) {
      monthlyStats[record.month - 1]++
    }
  })

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthlyDistribution = monthlyStats.map((count, month) => ({
    month: monthNames[month],
    monthNum: month + 1,
    count,
    percentage: (count / validRecords.length) * 100
  }))

  return {
    hourlyDistribution,
    dailyDistribution,
    weeklyDistribution,
    monthlyDistribution
  }
}
