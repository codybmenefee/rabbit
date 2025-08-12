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
  endOfMonth, 
  endOfQuarter, 
  endOfYear,
  subDays,
  subMonths,
  subYears,
  isWithinInterval,
  format,
  getHours,
  getDay,
  parseISO,
  differenceInMinutes,
  differenceInDays,
  startOfDay,
  endOfDay
} from 'date-fns'

function applyFilters(records: WatchRecord[], filters: FilterOptions): WatchRecord[] {
  let filtered = [...records]
  const now = new Date()

  // Debug logging for large datasets
  if (records.length > 1000) {
    console.log('🔧 Large dataset filtering:', {
      totalRecords: records.length,
      timeframe: filters.timeframe,
      sampleTimestamps: records.slice(0, 10).map(r => ({ 
        id: r.id, 
        watchedAt: r.watchedAt,
        rawTimestamp: r.rawTimestamp,
        videoTitle: r.videoTitle?.substring(0, 30)
      }))
    })
  }

  // Apply timeframe filter - only to records with valid timestamps
  const beforeTimestampFilter = filtered.length
  const recordsWithTimestamps = filtered.filter(r => r.watchedAt !== null)
  
  if (records.length > 1000) {
    console.log('📅 After timestamp filter:', {
      before: beforeTimestampFilter,
      withTimestamps: recordsWithTimestamps.length,
      nullTimestamps: beforeTimestampFilter - recordsWithTimestamps.length
    })
    
    // For debugging: show some records with null timestamps
    const nullTimestampSample = filtered.filter(r => r.watchedAt === null).slice(0, 3)
    console.log('🚨 Sample null timestamp records:', nullTimestampSample.map(r => ({
      id: r.id,
      rawTimestamp: r.rawTimestamp,
      videoTitle: r.videoTitle?.substring(0, 40)
    })))
  }
  
  // TEMPORARY: Don't filter out null timestamps for debugging
  // filtered = recordsWithTimestamps
  
  // TEMPORARY: Skip timeframe filtering if most records have null timestamps
  const hasValidTimestamps = recordsWithTimestamps.length > 0
  if (hasValidTimestamps && filters.timeframe !== 'All') {
    filtered = recordsWithTimestamps
    switch (filters.timeframe) {
      case 'MTD':
        filtered = filtered.filter(r => {
          const watchDate = parseISO(r.watchedAt!)
          return isWithinInterval(watchDate, { start: startOfMonth(now), end: now })
        })
        break
      case 'QTD':
        filtered = filtered.filter(r => {
          const watchDate = parseISO(r.watchedAt!)
          return isWithinInterval(watchDate, { start: startOfQuarter(now), end: now })
        })
        break
      case 'YTD':
        filtered = filtered.filter(r => {
          const watchDate = parseISO(r.watchedAt!)
          return isWithinInterval(watchDate, { start: startOfYear(now), end: now })
        })
        break
      case 'Last6M':
        filtered = filtered.filter(r => {
          const watchDate = parseISO(r.watchedAt!)
          return isWithinInterval(watchDate, { start: subMonths(now, 6), end: now })
        })
        break
      case 'Last12M':
        filtered = filtered.filter(r => {
          const watchDate = parseISO(r.watchedAt!)
          return isWithinInterval(watchDate, { start: subMonths(now, 12), end: now })
        })
        break
    }
  } else {
    // Keep all records for 'All' timeframe or when timestamps are missing
    console.log('⚠️ Keeping all records due to missing timestamps or All timeframe')
  }

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

  if (records.length > 1000) {
    console.log('✅ Final filtering result:', {
      originalCount: records.length,
      finalCount: filtered.length,
      sampleFinalRecords: filtered.slice(0, 3).map(r => ({
        id: r.id,
        watchedAt: r.watchedAt,
        title: r.videoTitle?.substring(0, 30),
        channel: r.channelTitle
      }))
    })
  }

  return filtered
}

export function computeKPIMetrics(records: WatchRecord[], filters: FilterOptions): KPIMetrics {
  const now = new Date()
  const allRecords = records.filter(r => r.watchedAt !== null)
  
  // Current period metrics using separate filters
  const ytdRecords = allRecords.filter(r => {
    const watchDate = parseISO(r.watchedAt!)
    return isWithinInterval(watchDate, { start: startOfYear(now), end: now })
  })
  const qtdRecords = allRecords.filter(r => {
    const watchDate = parseISO(r.watchedAt!)
    return isWithinInterval(watchDate, { start: startOfQuarter(now), end: now })
  })
  const mtdRecords = allRecords.filter(r => {
    const watchDate = parseISO(r.watchedAt!)
    return isWithinInterval(watchDate, { start: startOfMonth(now), end: now })
  })

  // Previous year same period for YOY - calculate equivalent periods last year
  const lastYear = subYears(now, 1)
  const lastYearYtd = allRecords.filter(r => {
    const watchDate = parseISO(r.watchedAt!)
    const lastYearEnd = new Date(lastYear.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds())
    return isWithinInterval(watchDate, { 
      start: startOfYear(lastYear), 
      end: lastYearEnd
    })
  })
  const lastYearQtd = allRecords.filter(r => {
    const watchDate = parseISO(r.watchedAt!)
    const lastYearEnd = new Date(lastYear.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds())
    return isWithinInterval(watchDate, { 
      start: startOfQuarter(lastYear), 
      end: lastYearEnd
    })
  })
  const lastYearMtd = allRecords.filter(r => {
    const watchDate = parseISO(r.watchedAt!)
    const lastYearEnd = new Date(lastYear.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds())
    return isWithinInterval(watchDate, { 
      start: startOfMonth(lastYear), 
      end: lastYearEnd
    })
  })

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
    if (!record.watchedAt) return
    
    const watchDate = parseISO(record.watchedAt)
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
    if (!record.watchedAt) return
    
    const watchDate = parseISO(record.watchedAt)
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
    if (!r.watchedAt) return false
    const watchDate = parseISO(r.watchedAt)
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
  },
  id?: string
): WatchRecord {
  const watchedAt = rawData.watchedAt || null
  const date = rawData.watchedAt ? parseISO(rawData.watchedAt) : null
  
  const topics = deriveTopics(
    rawData.videoTitle || '',
    rawData.channelTitle || ''
  )
  
  const product: Product = rawData.product === 'YouTube Music' ? 'YouTube Music' : 'YouTube'
  
  return {
    id: id || `${watchedAt}-${rawData.videoUrl || rawData.videoTitle}`,
    watchedAt,
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
  const validRecords = records.filter(r => r.watchedAt !== null)
  
  if (validRecords.length === 0) {
    return {
      totalVideos: 0,
      uniqueChannels: 0,
      totalDays: 0,
      avgVideosPerDay: 0,
      dateRange: { start: null, end: null }
    }
  }

  // Calculate date range
  const dates = validRecords
    .map(r => parseISO(r.watchedAt!))
    .sort((a, b) => a.getTime() - b.getTime())
  
  const startDate = dates[0]
  const endDate = dates[dates.length - 1]
  const totalDays = differenceInDays(endDate, startDate) + 1
  
  // Calculate unique metrics
  const uniqueChannels = new Set(
    validRecords.map(r => r.channelTitle).filter(Boolean)
  ).size

  return {
    totalVideos: validRecords.length,
    uniqueChannels,
    totalDays,
    avgVideosPerDay: totalDays > 0 ? (validRecords.length / totalDays) : 0,
    dateRange: { start: startDate, end: endDate }
  }
}

export function computeSessionAnalysis(records: WatchRecord[]) {
  const validRecords = records
    .filter(r => r.watchedAt !== null)
    .sort((a, b) => parseISO(a.watchedAt!).getTime() - parseISO(b.watchedAt!).getTime())

  if (validRecords.length === 0) {
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

  let currentSession: WatchRecord[] = [validRecords[0]]
  
  for (let i = 1; i < validRecords.length; i++) {
    const currentTime = parseISO(validRecords[i].watchedAt!)
    const lastTime = parseISO(validRecords[i - 1].watchedAt!)
    const gapMinutes = differenceInMinutes(currentTime, lastTime)
    
    if (gapMinutes > SESSION_BREAK_MINUTES) {
      // End current session and start new one
      if (currentSession.length > 0) {
        const sessionStart = parseISO(currentSession[0].watchedAt!)
        const sessionEnd = parseISO(currentSession[currentSession.length - 1].watchedAt!)
        const duration = differenceInMinutes(sessionEnd, sessionStart)
        
        // Calculate average gap between videos in session
        let totalGap = 0
        for (let j = 1; j < currentSession.length; j++) {
          totalGap += differenceInMinutes(
            parseISO(currentSession[j].watchedAt!),
            parseISO(currentSession[j - 1].watchedAt!)
          )
        }
        const avgGap = currentSession.length > 1 ? totalGap / (currentSession.length - 1) : 0
        
        sessions.push({
          id: `session-${sessions.length + 1}`,
          startTime: currentSession[0].watchedAt!,
          endTime: currentSession[currentSession.length - 1].watchedAt!,
          videos: [...currentSession],
          duration,
          avgGapMinutes: avgGap
        })
      }
      
      currentSession = [validRecords[i]]
    } else {
      currentSession.push(validRecords[i])
    }
  }
  
  // Add the final session
  if (currentSession.length > 0) {
    const sessionStart = parseISO(currentSession[0].watchedAt!)
    const sessionEnd = parseISO(currentSession[currentSession.length - 1].watchedAt!)
    const duration = differenceInMinutes(sessionEnd, sessionStart)
    
    let totalGap = 0
    for (let j = 1; j < currentSession.length; j++) {
      totalGap += differenceInMinutes(
        parseISO(currentSession[j].watchedAt!),
        parseISO(currentSession[j - 1].watchedAt!)
      )
    }
    const avgGap = currentSession.length > 1 ? totalGap / (currentSession.length - 1) : 0
    
    sessions.push({
      id: `session-${sessions.length + 1}`,
      startTime: currentSession[0].watchedAt!,
      endTime: currentSession[currentSession.length - 1].watchedAt!,
      videos: [...currentSession],
      duration,
      avgGapMinutes: avgGap
    })
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