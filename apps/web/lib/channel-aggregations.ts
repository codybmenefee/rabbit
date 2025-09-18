import {
  WatchRecord,
  EnhancedChannelMetrics,
  ChannelRelationship,
  ChannelSession,
  ChannelEvolution,
  FilterOptions
} from '@/types/records'
import {
  parseISO,
  format,
  differenceInDays,
  differenceInMonths,
  isWithinInterval,
  subDays,
  subMonths,
  getHours,
  getDay,
  startOfMonth,
  startOfQuarter,
  startOfYear
} from 'date-fns'

/**
 * Computes enhanced channel metrics with loyalty scoring and viewing patterns
 */
export function computeEnhancedChannelMetrics(
  records: WatchRecord[],
  filters?: FilterOptions
): EnhancedChannelMetrics[] {
  const channelMap = new Map<string, {
    records: WatchRecord[]
    hourDistribution: Map<number, number>
    dayDistribution: Map<number, number>
    monthlyBreakdown: Map<string, number>
  }>()

  // Group records by channel
  const filteredRecords = filters ? applyFilters(records, filters) : records
  
  filteredRecords.forEach(record => {
    if (!record.channelTitle || !record.watchedAt) return

    if (!channelMap.has(record.channelTitle)) {
      channelMap.set(record.channelTitle, {
        records: [],
        hourDistribution: new Map(),
        dayDistribution: new Map(),
        monthlyBreakdown: new Map()
      })
    }

    const channelData = channelMap.get(record.channelTitle)!
    channelData.records.push(record)

    // Track viewing patterns
    const watchDate = parseISO(record.watchedAt)
    const hour = getHours(watchDate)
    const day = getDay(watchDate)
    const monthKey = format(watchDate, 'yyyy-MM')

    channelData.hourDistribution.set(hour, (channelData.hourDistribution.get(hour) || 0) + 1)
    channelData.dayDistribution.set(day, (channelData.dayDistribution.get(day) || 0) + 1)
    channelData.monthlyBreakdown.set(monthKey, (channelData.monthlyBreakdown.get(monthKey) || 0) + 1)
  })

  const now = new Date()
  const thirtyDaysAgo = subDays(now, 30)

  return Array.from(channelMap.entries()).map(([channelTitle, data]) => {
    const { records: channelRecords, hourDistribution, dayDistribution, monthlyBreakdown } = data
    
    // Basic metrics with null safety
    const validDates = channelRecords
      .filter(r => r.watchedAt !== null)
      .map(r => parseISO(r.watchedAt!))
      .sort((a, b) => a.getTime() - b.getTime())
    
    if (validDates.length === 0) {
      // Handle channels with no valid dates
      return {
        channelTitle,
        channelUrl: channelRecords[0]?.channelUrl || undefined,
        videoCount: channelRecords.length,
        totalWatchTime: channelRecords.length * 300,
        averageVideosPerMonth: 0,
        firstWatched: new Date(),
        lastWatched: new Date(),
        loyaltyScore: 0,
        topicsSpread: Array.from(new Set(channelRecords.flatMap(r => r.topics))),
        viewingPattern: {
          peakHour: 12,
          peakDay: 0,
          consistencyScore: 0
        },
        discoveryMetrics: {
          isNew: false,
          retentionRate: 0,
          sessionFrequency: 0
        },
        relatedChannels: []
      }
    }
    
    const firstWatched = validDates[0]
    const lastWatched = validDates[validDates.length - 1]
    
    // Calculate viewing span and frequency
    const daysSinceFirst = differenceInDays(now, firstWatched)
    const monthsSinceFirst = differenceInMonths(now, firstWatched)
    const averageVideosPerMonth = monthsSinceFirst > 0 ? channelRecords.length / monthsSinceFirst : channelRecords.length

    // Loyalty score calculation (0-100)
    const consistencyScore = calculateConsistencyScore(monthlyBreakdown, monthsSinceFirst)
    const frequencyScore = Math.min(averageVideosPerMonth * 10, 50) // Max 50 points for frequency
    const recencyScore = calculateRecencyScore(lastWatched, now)
    const loyaltyScore = Math.round((consistencyScore + frequencyScore + recencyScore) / 3)

    // Peak viewing patterns
    const peakHour = Array.from(hourDistribution.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 12
    
    const peakDay = Array.from(dayDistribution.entries())
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 0

    // Topics spread
    const topicsSpread = Array.from(
      new Set(channelRecords.flatMap(r => r.topics))
    )

    // Discovery metrics
    const isNew = firstWatched > thirtyDaysAgo
    const recentVideos = channelRecords.filter(r => 
      parseISO(r.watchedAt!) > thirtyDaysAgo
    ).length
    const sessionFrequency = calculateSessionFrequency(channelRecords)

    return {
      channelTitle,
      channelUrl: channelRecords[0]?.channelUrl || undefined,
      videoCount: channelRecords.length,
      totalWatchTime: channelRecords.length * 300, // Estimated
      averageVideosPerMonth,
      firstWatched,
      lastWatched,
      loyaltyScore,
      topicsSpread,
      viewingPattern: {
        peakHour,
        peakDay,
        consistencyScore
      },
      discoveryMetrics: {
        isNew,
        retentionRate: recentVideos / Math.max(channelRecords.length, 1),
        sessionFrequency
      },
      relatedChannels: [] // Will be populated by relationship analysis
    }
  }).sort((a, b) => b.videoCount - a.videoCount)
}

/**
 * Analyzes relationships between channels based on co-watching patterns
 */
export function computeChannelRelationships(
  records: WatchRecord[]
): ChannelRelationship[] {
  const sessions = detectViewingSessions(records)
  const relationships = new Map<string, {
    channel1: string
    channel2: string
    coWatchCount: number
    totalSessions1: number
    totalSessions2: number
    topicOverlap: Set<string>
  }>()

  sessions.forEach(session => {
    if (session.channels.length < 2) return

    // Create relationships for each pair of channels in the session
    for (let i = 0; i < session.channels.length; i++) {
      for (let j = i + 1; j < session.channels.length; j++) {
        const [ch1, ch2] = [session.channels[i], session.channels[j]].sort()
        const key = `${ch1}|${ch2}`

        if (!relationships.has(key)) {
          relationships.set(key, {
            channel1: ch1,
            channel2: ch2,
            coWatchCount: 0,
            totalSessions1: 0,
            totalSessions2: 0,
            topicOverlap: new Set()
          })
        }

        const rel = relationships.get(key)!
        rel.coWatchCount++
        session.topicMix.forEach(topic => rel.topicOverlap.add(topic))
      }
    }
  })

  // Calculate session totals for each channel
  const channelSessionCounts = new Map<string, number>()
  sessions.forEach(session => {
    session.channels.forEach(channel => {
      channelSessionCounts.set(channel, (channelSessionCounts.get(channel) || 0) + 1)
    })
  })

  return Array.from(relationships.values()).map(rel => {
    const total1 = channelSessionCounts.get(rel.channel1) || 1
    const total2 = channelSessionCounts.get(rel.channel2) || 1
    const coWatchScore = Math.round(
      (rel.coWatchCount / Math.min(total1, total2)) * 100
    )

    return {
      channel1: rel.channel1,
      channel2: rel.channel2,
      coWatchScore,
      topicOverlap: Array.from(rel.topicOverlap),
      temporalCorrelation: 0.5 // Placeholder for now
    }
  }).filter(rel => rel.coWatchScore >= 10) // Only significant relationships
   .sort((a, b) => b.coWatchScore - a.coWatchScore)
}

/**
 * Computes channel evolution over time
 */
export function computeChannelEvolution(
  records: WatchRecord[],
  channelTitle: string
): ChannelEvolution {
  const channelRecords = records.filter(r => r.channelTitle === channelTitle)
  const monthlyData = new Map<string, {
    videos: number
    topics: Set<string>
  }>()

  channelRecords.forEach(record => {
    if (!record.watchedAt) return
    
    const monthKey = format(parseISO(record.watchedAt), 'MMM yyyy')
    
    if (!monthlyData.has(monthKey)) {
      monthlyData.set(monthKey, {
        videos: 0,
        topics: new Set()
      })
    }

    const monthData = monthlyData.get(monthKey)!
    monthData.videos++
    record.topics.forEach(topic => monthData.topics.add(topic))
  })

  const timelineData = Array.from(monthlyData.entries())
    .map(([month, data]) => ({
      month,
      videoCount: data.videos,
      topicDiversity: data.topics.size,
      engagementTrend: 'stable' as 'up' | 'down' | 'stable' // Simplified for now
    }))
    .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

  return {
    channelTitle,
    timelineData
  }
}

/**
 * Detects viewing sessions based on temporal proximity
 */
function detectViewingSessions(records: WatchRecord[]): ChannelSession[] {
  type ValidRecord = WatchRecord & { watchedAt: Date }
  
  const validRecords: ValidRecord[] = records
    .filter(r => r.watchedAt)
    .map(r => ({ ...r, watchedAt: parseISO(r.watchedAt!) }))
    .sort((a, b) => a.watchedAt.getTime() - b.watchedAt.getTime())

  const sessions: ChannelSession[] = []
  let currentSession: {
    records: ValidRecord[]
    startTime: Date
  } | null = null

  const SESSION_GAP_MINUTES = 30

  validRecords.forEach(record => {
    if (!currentSession || 
        (record.watchedAt.getTime() - currentSession.startTime.getTime()) > SESSION_GAP_MINUTES * 60 * 1000) {
      // Start new session
      if (currentSession && currentSession.records.length > 0) {
        sessions.push(createSessionFromRecords(currentSession.records))
      }
      currentSession = {
        records: [record],
        startTime: record.watchedAt
      }
    } else {
      // Add to current session
      currentSession.records.push(record)
    }
  })

  // Don't forget the last session
  if (currentSession && currentSession.records.length > 0) {
    sessions.push(createSessionFromRecords(currentSession.records))
  }

  return sessions
}

function createSessionFromRecords(records: (WatchRecord & { watchedAt: Date })[]): ChannelSession {
  const channels = Array.from(new Set(records.map(r => r.channelTitle).filter(Boolean)))
  const topics = Array.from(new Set(records.flatMap(r => r.topics)))
  const startTime = records[0].watchedAt
  const endTime = records[records.length - 1].watchedAt

  return {
    date: startTime,
    channels: channels as string[],
    sessionDuration: endTime.getTime() - startTime.getTime(),
    videoCount: records.length,
    topicMix: topics
  }
}

function calculateConsistencyScore(monthlyBreakdown: Map<string, number>, totalMonths: number): number {
  if (totalMonths <= 1) return 100
  
  const activeMonths = monthlyBreakdown.size
  const consistencyRatio = activeMonths / totalMonths
  
  // Bonus for regular activity
  const values = Array.from(monthlyBreakdown.values())
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length
  const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length
  const regularityBonus = Math.max(0, 20 - (variance / avg) * 10)
  
  return Math.min(100, Math.round(consistencyRatio * 80 + regularityBonus))
}

function calculateRecencyScore(lastWatched: Date, now: Date): number {
  const daysSinceLastWatch = differenceInDays(now, lastWatched)
  
  if (daysSinceLastWatch <= 7) return 100
  if (daysSinceLastWatch <= 30) return 80
  if (daysSinceLastWatch <= 90) return 60
  if (daysSinceLastWatch <= 180) return 40
  if (daysSinceLastWatch <= 365) return 20
  return 10
}

function calculateSessionFrequency(records: WatchRecord[]): number {
  const sessions = detectViewingSessions(records)
  const channelSessions = sessions.filter(s => s.channels.length > 1)
  return channelSessions.length / Math.max(sessions.length, 1)
}

// Helper function to apply filters - consistent with main aggregations
function applyFilters(records: WatchRecord[], filters: FilterOptions): WatchRecord[] {
  let filtered = [...records]
  const now = new Date()

  // Apply timeframe filter - only to records with valid timestamps
  filtered = filtered.filter(r => r.watchedAt !== null)
  
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
    case 'All':
    default:
      break
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

  return filtered
}