import { WatchRecord, FilterOptions } from '@/types/records'
import { 
  parseISO,
  format,
  startOfDay,
  endOfDay,
  eachDayOfInterval,
  subDays,
  subMonths,
  differenceInDays,
  differenceInHours,
  getHours,
  getDay,
  startOfWeek,
  endOfWeek,
  isWithinInterval
} from 'date-fns'

// Advanced KPI Metrics
export interface AdvancedKPIMetrics {
  // Core metrics
  totalVideos: number
  uniqueChannels: number
  estimatedWatchTime: number
  
  // Distribution metrics
  avgVideosPerDay: number
  avgSessionLength: number
  contentDiversityIndex: number
  
  // Engagement metrics  
  repeatChannelRate: number
  discoveryRate: number
  bingeSessionCount: number
  
  // Consistency metrics
  viewingConsistencyScore: number
  peakActivityWindow: { start: number; end: number }
  weekendVsWeekdayRatio: number
  
  // Growth metrics
  monthlyGrowthRate: number
  quarterlyGrowthRate: number
  
  // Quality metrics
  longFormContentRatio: number
  educationalContentRatio: number
}

// Session Analysis
export interface SessionAnalysis {
  totalSessions: number
  avgSessionLength: number
  maxSessionLength: number
  sessionsPerDay: number
  bingeSessions: number
  shortSessions: number
  typicalSessionLength: number
  sessionsByTimeOfDay: { hour: number; count: number }[]
}

// Time Series Data Point
export interface TimeSeriesPoint {
  date: string
  value: number
  label?: string
}

// Statistical Analysis
export interface StatisticalAnalysis {
  mean: number
  median: number
  mode: number | null
  standardDeviation: number
  percentiles: {
    p10: number
    p25: number
    p50: number
    p75: number
    p90: number
    p95: number
    p99: number
  }
}

// Viewing Pattern Analysis
export interface ViewingPattern {
  type: 'binge' | 'consistent' | 'sporadic' | 'weekend_warrior' | 'night_owl' | 'morning_bird'
  confidence: number
  description: string
  evidence: string[]
}

// Content Quality Metrics
export interface ContentQualityMetrics {
  educationalRatio: number
  entertainmentRatio: number
  newsRatio: number
  longFormRatio: number
  shortFormRatio: number
  diversityScore: number
  algorithmInfluenceScore: number
}

export function computeAdvancedKPIs(
  records: WatchRecord[], 
  filters: FilterOptions = { timeframe: 'All', product: 'All', topics: [], channels: [] }
): AdvancedKPIMetrics {
  // Apply basic filtering
  const filtered = applyBasicFilters(records, filters)
  const validRecords = filtered.filter(r => r.watchedAt !== null)
  
  if (validRecords.length === 0) {
    return getEmptyAdvancedKPIs()
  }

  // Basic counts
  const totalVideos = validRecords.length
  const uniqueChannels = new Set(validRecords.map(r => r.channelTitle).filter(Boolean)).size
  const estimatedWatchTime = totalVideos * 300 // 5 min average estimate

  // Date range analysis
  const dates = validRecords.map(r => parseISO(r.watchedAt!)).sort((a, b) => a.getTime() - b.getTime())
  const dateRange = differenceInDays(dates[dates.length - 1], dates[0])
  const avgVideosPerDay = dateRange > 0 ? totalVideos / dateRange : totalVideos

  // Session analysis
  const sessions = detectSessions(validRecords)
  const avgSessionLength = sessions.length > 0 
    ? sessions.reduce((sum, s) => sum + s.length, 0) / sessions.length 
    : 1

  // Content diversity (topics per record)
  const topicCounts = validRecords.flatMap(r => r.topics)
  const uniqueTopics = new Set(topicCounts).size
  const contentDiversityIndex = uniqueTopics / Math.max(1, totalVideos) * 100

  // Channel engagement
  const channelCounts = new Map<string, number>()
  validRecords.forEach(r => {
    if (r.channelTitle) {
      channelCounts.set(r.channelTitle, (channelCounts.get(r.channelTitle) || 0) + 1)
    }
  })
  const repeatChannels = Array.from(channelCounts.values()).filter(count => count > 1).length
  const repeatChannelRate = uniqueChannels > 0 ? (repeatChannels / uniqueChannels) * 100 : 0

  // Discovery rate (new channels over time)
  const discoveryRate = calculateDiscoveryRate(validRecords)

  // Binge sessions (sessions with 5+ videos)
  const bingeSessionCount = sessions.filter(session => session.length >= 5).length

  // Viewing consistency
  const viewingConsistencyScore = calculateConsistencyScore(validRecords)

  // Peak activity window
  const hourlyActivity = new Array(24).fill(0)
  validRecords.forEach(r => {
    if (r.hour !== null) hourlyActivity[r.hour]++
  })
  const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity))
  const peakActivityWindow = { start: Math.max(0, peakHour - 1), end: Math.min(23, peakHour + 1) }

  // Weekend vs weekday ratio
  const weekendVideos = validRecords.filter(r => r.dayOfWeek === 0 || r.dayOfWeek === 6).length
  const weekdayVideos = totalVideos - weekendVideos
  const weekendVsWeekdayRatio = weekdayVideos > 0 ? weekendVideos / weekdayVideos : 0

  // Growth rates
  const monthlyGrowthRate = calculateGrowthRate(validRecords, 'monthly')
  const quarterlyGrowthRate = calculateGrowthRate(validRecords, 'quarterly')

  // Content quality metrics
  const educationalTopics = ['education', 'tech', 'science', 'news']
  const educationalVideos = validRecords.filter(r => 
    r.topics.some(topic => educationalTopics.includes(topic.toLowerCase()))
  ).length
  const educationalContentRatio = (educationalVideos / totalVideos) * 100

  // Long form estimation (YouTube vs YouTube Music as proxy)
  const longFormVideos = validRecords.filter(r => r.product === 'YouTube').length
  const longFormContentRatio = (longFormVideos / totalVideos) * 100

  return {
    totalVideos,
    uniqueChannels,
    estimatedWatchTime,
    avgVideosPerDay: Math.round(avgVideosPerDay * 10) / 10,
    avgSessionLength: Math.round(avgSessionLength * 10) / 10,
    contentDiversityIndex: Math.round(contentDiversityIndex * 10) / 10,
    repeatChannelRate: Math.round(repeatChannelRate * 10) / 10,
    discoveryRate,
    bingeSessionCount,
    viewingConsistencyScore,
    peakActivityWindow,
    weekendVsWeekdayRatio: Math.round(weekendVsWeekdayRatio * 100) / 100,
    monthlyGrowthRate,
    quarterlyGrowthRate,
    longFormContentRatio: Math.round(longFormContentRatio * 10) / 10,
    educationalContentRatio: Math.round(educationalContentRatio * 10) / 10
  }
}

export function computeSessionAnalysis(records: WatchRecord[]): SessionAnalysis {
  const validRecords = records.filter(r => r.watchedAt !== null)
  const sessions = detectSessions(validRecords)
  
  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      avgSessionLength: 0,
      maxSessionLength: 0,
      sessionsPerDay: 0,
      bingeSessions: 0,
      shortSessions: 0,
      typicalSessionLength: 0,
      sessionsByTimeOfDay: []
    }
  }

  const sessionLengths = sessions.map(s => s.length)
  const totalSessions = sessions.length
  const avgSessionLength = sessionLengths.reduce((sum, len) => sum + len, 0) / totalSessions
  const maxSessionLength = Math.max(...sessionLengths)
  
  // Calculate sessions per day
  const dates = validRecords.map(r => parseISO(r.watchedAt!))
  const dateRange = differenceInDays(Math.max(...dates.map(d => d.getTime())), Math.min(...dates.map(d => d.getTime())))
  const sessionsPerDay = dateRange > 0 ? totalSessions / dateRange : totalSessions

  const bingeSessions = sessions.filter(s => s.length >= 5).length
  const shortSessions = sessions.filter(s => s.length <= 2).length
  
  // Modal session length (most common)
  const lengthCounts = new Map<number, number>()
  sessionLengths.forEach(len => {
    lengthCounts.set(len, (lengthCounts.get(len) || 0) + 1)
  })
  const typicalSessionLength = Array.from(lengthCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 0

  // Sessions by time of day
  const sessionsByTimeOfDay = new Array(24).fill(0).map((_, hour) => ({ hour, count: 0 }))
  sessions.forEach(session => {
    if (session.length > 0 && session[0].hour !== null) {
      sessionsByTimeOfDay[session[0].hour].count++
    }
  })

  return {
    totalSessions,
    avgSessionLength: Math.round(avgSessionLength * 10) / 10,
    maxSessionLength,
    sessionsPerDay: Math.round(sessionsPerDay * 10) / 10,
    bingeSessions,
    shortSessions,
    typicalSessionLength,
    sessionsByTimeOfDay
  }
}

export function computeTimeSeriesData(
  records: WatchRecord[], 
  metric: 'videos' | 'channels' | 'topics',
  interval: 'daily' | 'weekly' | 'monthly' = 'daily'
): TimeSeriesPoint[] {
  const validRecords = records.filter(r => r.watchedAt !== null)
  
  if (validRecords.length === 0) return []

  const dates = validRecords.map(r => parseISO(r.watchedAt!))
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))

  const timePoints: TimeSeriesPoint[] = []
  
  if (interval === 'daily') {
    const days = eachDayOfInterval({ start: minDate, end: maxDate })
    
    days.forEach(day => {
      const dayRecords = validRecords.filter(r => {
        const recordDate = parseISO(r.watchedAt!)
        return isWithinInterval(recordDate, { start: startOfDay(day), end: endOfDay(day) })
      })

      let value = 0
      switch (metric) {
        case 'videos':
          value = dayRecords.length
          break
        case 'channels':
          value = new Set(dayRecords.map(r => r.channelTitle).filter(Boolean)).size
          break
        case 'topics':
          value = new Set(dayRecords.flatMap(r => r.topics)).size
          break
      }

      timePoints.push({
        date: format(day, 'yyyy-MM-dd'),
        value,
        label: format(day, 'MMM d')
      })
    })
  }

  return timePoints
}

export function computeViewingPatterns(records: WatchRecord[]): ViewingPattern[] {
  const validRecords = records.filter(r => r.watchedAt !== null)
  const patterns: ViewingPattern[] = []

  if (validRecords.length === 0) return patterns

  // Analyze binge watching
  const sessions = detectSessions(validRecords)
  const bingeSessions = sessions.filter(s => s.length >= 5)
  if (bingeSessions.length > sessions.length * 0.3) {
    patterns.push({
      type: 'binge',
      confidence: Math.min(0.9, (bingeSessions.length / sessions.length) * 1.2),
      description: 'Frequent binge watching sessions detected',
      evidence: [`${bingeSessions.length} binge sessions (5+ videos) out of ${sessions.length} total sessions`]
    })
  }

  // Analyze time-of-day patterns
  const hourCounts = new Array(24).fill(0)
  validRecords.forEach(r => {
    if (r.hour !== null) hourCounts[r.hour]++
  })

  const nightHours = [22, 23, 0, 1, 2, 3] // 10 PM to 3 AM
  const morningHours = [6, 7, 8, 9, 10] // 6 AM to 10 AM
  const weekendHours = [10, 11, 12, 13, 14, 15] // 10 AM to 3 PM

  const nightActivity = nightHours.reduce((sum, hour) => sum + hourCounts[hour], 0)
  const morningActivity = morningHours.reduce((sum, hour) => sum + hourCounts[hour], 0)
  const totalActivity = validRecords.length

  if (nightActivity > totalActivity * 0.4) {
    patterns.push({
      type: 'night_owl',
      confidence: Math.min(0.9, (nightActivity / totalActivity) * 2),
      description: 'Primary viewing happens during late night hours',
      evidence: [`${Math.round((nightActivity / totalActivity) * 100)}% of viewing between 10 PM - 3 AM`]
    })
  }

  if (morningActivity > totalActivity * 0.3) {
    patterns.push({
      type: 'morning_bird',
      confidence: Math.min(0.9, (morningActivity / totalActivity) * 2.5),
      description: 'Regular early morning viewing pattern',
      evidence: [`${Math.round((morningActivity / totalActivity) * 100)}% of viewing between 6 AM - 10 AM`]
    })
  }

  return patterns
}

// Helper functions
function applyBasicFilters(records: WatchRecord[], filters: FilterOptions): WatchRecord[] {
  let filtered = [...records]
  
  if (filters.product !== 'All') {
    filtered = filtered.filter(r => r.product === filters.product)
  }
  
  if (filters.topics && filters.topics.length > 0) {
    filtered = filtered.filter(r => 
      r.topics.some(topic => filters.topics?.includes(topic))
    )
  }
  
  if (filters.channels && filters.channels.length > 0) {
    filtered = filtered.filter(r => 
      r.channelTitle && filters.channels?.includes(r.channelTitle)
    )
  }
  
  return filtered
}

function detectSessions(records: WatchRecord[]): WatchRecord[][] {
  const sortedRecords = records
    .filter(r => r.watchedAt !== null)
    .sort((a, b) => parseISO(a.watchedAt!).getTime() - parseISO(b.watchedAt!).getTime())

  const sessions: WatchRecord[][] = []
  let currentSession: WatchRecord[] = []
  
  sortedRecords.forEach((record, index) => {
    if (currentSession.length === 0) {
      currentSession.push(record)
    } else {
      const prevTime = parseISO(currentSession[currentSession.length - 1].watchedAt!)
      const currentTime = parseISO(record.watchedAt!)
      const hoursDiff = differenceInHours(currentTime, prevTime)
      
      // Consider videos within 2 hours as part of same session
      if (hoursDiff <= 2) {
        currentSession.push(record)
      } else {
        sessions.push([...currentSession])
        currentSession = [record]
      }
    }
  })
  
  if (currentSession.length > 0) {
    sessions.push(currentSession)
  }
  
  return sessions
}

function calculateDiscoveryRate(records: WatchRecord[]): number {
  const channelFirstSeen = new Map<string, Date>()
  const sortedRecords = records
    .filter(r => r.watchedAt !== null && r.channelTitle)
    .sort((a, b) => parseISO(a.watchedAt!).getTime() - parseISO(b.watchedAt!).getTime())

  sortedRecords.forEach(record => {
    if (!channelFirstSeen.has(record.channelTitle!)) {
      channelFirstSeen.set(record.channelTitle!, parseISO(record.watchedAt!))
    }
  })

  // Calculate new channels per month
  const dates = Array.from(channelFirstSeen.values())
  if (dates.length < 2) return 0

  const monthRange = differenceInDays(dates[dates.length - 1], dates[0]) / 30
  return monthRange > 0 ? Math.round((dates.length / monthRange) * 10) / 10 : 0
}

function calculateConsistencyScore(records: WatchRecord[]): number {
  const dailyActivity = new Map<string, number>()
  
  records.forEach(record => {
    if (record.watchedAt) {
      const day = format(parseISO(record.watchedAt), 'yyyy-MM-dd')
      dailyActivity.set(day, (dailyActivity.get(day) || 0) + 1)
    }
  })

  const activities = Array.from(dailyActivity.values())
  if (activities.length === 0) return 0

  const mean = activities.reduce((sum, count) => sum + count, 0) / activities.length
  const variance = activities.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / activities.length
  const standardDeviation = Math.sqrt(variance)
  
  // Lower standard deviation relative to mean = higher consistency
  const consistencyScore = mean > 0 ? Math.max(0, 100 - (standardDeviation / mean) * 50) : 0
  return Math.round(consistencyScore * 10) / 10
}

function calculateGrowthRate(records: WatchRecord[], period: 'monthly' | 'quarterly'): number {
  const now = new Date()
  const periodMonths = period === 'monthly' ? 1 : 3
  
  const currentPeriod = records.filter(r => {
    if (!r.watchedAt) return false
    const date = parseISO(r.watchedAt)
    return isWithinInterval(date, { 
      start: subMonths(now, periodMonths), 
      end: now 
    })
  }).length

  const previousPeriod = records.filter(r => {
    if (!r.watchedAt) return false
    const date = parseISO(r.watchedAt)
    return isWithinInterval(date, { 
      start: subMonths(now, periodMonths * 2), 
      end: subMonths(now, periodMonths)
    })
  }).length

  if (previousPeriod === 0) return currentPeriod > 0 ? 100 : 0
  return Math.round(((currentPeriod - previousPeriod) / previousPeriod) * 100 * 10) / 10
}

function getEmptyAdvancedKPIs(): AdvancedKPIMetrics {
  return {
    totalVideos: 0,
    uniqueChannels: 0,
    estimatedWatchTime: 0,
    avgVideosPerDay: 0,
    avgSessionLength: 0,
    contentDiversityIndex: 0,
    repeatChannelRate: 0,
    discoveryRate: 0,
    bingeSessionCount: 0,
    viewingConsistencyScore: 0,
    peakActivityWindow: { start: 0, end: 23 },
    weekendVsWeekdayRatio: 0,
    monthlyGrowthRate: 0,
    quarterlyGrowthRate: 0,
    longFormContentRatio: 0,
    educationalContentRatio: 0
  }
}