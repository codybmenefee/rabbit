export interface VideoWatch {
  id: string
  title: string
  channel: string
  category: string
  duration: number // seconds
  watchedAt: Date
  watchedDuration: number // seconds actually watched
  url: string
  thumbnailUrl?: string
}

export interface TopicTrend {
  topic: string
  date: Date
  watchTime: number
  videoCount: number
  growthRate?: number
}

export interface CreatorMetrics {
  channel: string
  totalWatchTime: number
  videoCount: number
  averageWatchTime: number
  lastWatchedAt: Date
  loyaltyScore: number // 0-100
  category: string
  subscriberCount?: number
  avatarUrl?: string
}

export interface EventCorrelation {
  event: string
  date: Date
  description: string
  impactMetrics: {
    topic: string
    beforeAverage: number
    afterAverage: number
    percentageChange: number
  }[]
}

export interface TimeSeriesData {
  date: Date
  [topic: string]: number | Date
}

export interface InsightCard {
  id: string
  type: 'trend' | 'correlation' | 'discovery' | 'pattern'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  metric: {
    value: number
    change: number
    label: string
  }
  timeframe: string
}

export interface DashboardMetrics {
  totalWatchTime: number
  videosWatched: number
  uniqueChannels: number
  averageSessionLength: number
  topCategory: string
  diversityIndex: number
  previousPeriodComparison: {
    watchTime: number
    videos: number
    channels: number
  }
}

export type TopicCategory = 
  | 'Technology' 
  | 'Finance' 
  | 'Politics' 
  | 'Entertainment' 
  | 'Education' 
  | 'Gaming'
  | 'Music'
  | 'Sports'
  | 'News'
  | 'Science'
  | 'Cooking'
  | 'Travel'
  | 'Other'