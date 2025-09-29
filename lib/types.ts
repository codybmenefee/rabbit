// Core watch record
export interface WatchRecord {
  id: string
  watchedAt: string | null  // ISO string
  videoId: string | null
  videoTitle: string | null
  videoUrl: string | null
  channelTitle: string | null
  channelUrl: string | null
  product: 'YouTube' | 'YouTube Music'
  topics: string[]

  // Derived fields for aggregations
  year: number | null
  month: number | null
  week: number | null
  dayOfWeek: number | null
  hour: number | null
  yoyKey: string | null
}

export type TimeframeFilter = 'MTD' | 'QTD' | 'YTD' | 'Last6M' | 'Last12M' | 'All'
export type Product = 'YouTube' | 'YouTube Music' | 'All'

export interface FilterOptions {
  timeframe: TimeframeFilter
  product: Product
}

export interface KPIMetrics {
  totalVideos: number
  uniqueChannels: number
  totalWatchTime: number
}

export interface ChannelMetrics {
  channel: string
  videoCount: number
  watchTime: number
  percentage: number
}

export interface MonthlyCount {
  month: string
  videos: number
  watchTime: number
  uniqueChannels: number
}

export interface DayHourMatrix {
  day: string
  hour: number
  value: number
}

export interface TopicCount {
  topic: string
  count: number
  trend: 'up' | 'down' | 'stable'
  percentage: number
}

// Enhanced channel analysis types
export interface EnhancedChannelMetrics {
  channelTitle: string
  channelUrl?: string
  videoCount: number
  totalWatchTime: number
  averageVideosPerMonth: number
  firstWatched: Date
  lastWatched: Date
  loyaltyScore: number // 0-100 based on consistency and frequency
  topicsSpread: string[] // unique topics from this channel
  viewingPattern: {
    peakHour: number
    peakDay: number
    consistencyScore: number
  }
  discoveryMetrics: {
    isNew: boolean // discovered in last 30 days
    retentionRate: number // videos watched vs total channel uploads (estimated)
    sessionFrequency: number // how often watched in viewing sessions
  }
  relatedChannels: string[] // channels often watched together
}

export interface ChannelRelationship {
  channel1: string
  channel2: string
  coWatchScore: number // 0-100, how often watched together
  topicOverlap: string[]
  temporalCorrelation: number // timing correlation
}

export interface ChannelSession {
  date: Date
  channels: string[]
  sessionDuration: number
  videoCount: number
  topicMix: string[]
}

export interface ChannelEvolution {
  channelTitle: string
  timelineData: Array<{
    month: string
    videoCount: number
    topicDiversity: number
    engagementTrend: 'up' | 'down' | 'stable'
  }>
}

export interface AggregationResult {
  kpi: KPIMetrics
  monthlyTrend: MonthlyCount[]
  topChannels: ChannelMetrics[]
  dayTimeHeatmap: DayHourMatrix[]
  topicsLeaderboard: TopicCount[]
}
