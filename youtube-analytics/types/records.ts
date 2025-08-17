// Core watch record from Google Takeout parsing (Phase 1)
export interface WatchRecord {
  id: string
  watchedAt: string | null  // ISO string from parsed timestamp
  videoId: string | null    // Extracted from YouTube URL
  videoTitle: string | null
  videoUrl: string | null
  channelTitle: string | null
  channelUrl: string | null
  product: 'YouTube' | 'YouTube Music'
  topics: string[]          // Derived from title/channel analysis
  
  // Derived fields for aggregations
  year: number | null
  month: number | null
  week: number | null
  dayOfWeek: number | null
  hour: number | null
  yoyKey: string | null     // YYYY-MM format for YoY comparisons
  
  // Raw data preservation
  rawTimestamp?: string     // Original timestamp text from HTML
}

// Extended interface for Phase 2 with API enrichment
export interface EnrichedVideoWatch extends WatchRecord {
  // Additional fields from YouTube Data API (Phase 2)
  duration?: number         // seconds - from API
  watchedDuration?: number  // seconds actually watched - estimated/tracked
  category?: string         // YouTube category from API
  thumbnailUrl?: string     // from API
  description?: string      // from API
  viewCount?: number        // from API
  likeCount?: number        // from API
  publishedAt?: string      // from API
}

export interface ParsedEntry {
  videoTitle?: string
  videoUrl?: string
  channelTitle?: string
  channelUrl?: string
  timestamp?: string
  product?: string
  isAd?: boolean
}

export interface TimestampParsingStats {
  totalRecords: number
  recordsWithTimestamps: number
  recordsWithoutTimestamps: number
  timestampExtractionFailures: number
  lowConfidenceExtractions: number
  averageConfidence: number
  strategyUsage: Record<string, number>
  qualityMetrics: {
    withTimezones: number
    withFullDateTime: number
    formatRecognized: number
    dateReasonable: number
  }
}

export interface ImportSummary {
  totalRecords: number
  uniqueChannels: number
  dateRange: {
    start: Date | null
    end: Date | null
  }
  productBreakdown: {
    youtube: number
    youtubeMusic: number
  }
  parseErrors: number
  timestampStats?: TimestampParsingStats
}

export interface StorageMetadata {
  importedAt: string
  fileName: string
  fileSize: number
  recordCount: number
}

export type TimeframeFilter = 'MTD' | 'QTD' | 'YTD' | 'Last6M' | 'Last12M' | 'All'
export type Product = 'YouTube' | 'YouTube Music' | 'All'

export interface FilterOptions {
  timeframe: TimeframeFilter
  product: Product
  topics?: string[]
  channels?: string[]
}

export interface KPIMetrics {
  totalVideos: number
  uniqueChannels: number
  totalWatchTime: number
  ytdVideos: number
  qtdVideos: number
  mtdVideos: number
  ytdYoyDelta: number
  qtdYoyDelta: number
  mtdYoyDelta: number
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