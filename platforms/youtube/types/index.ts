/**
 * YouTube-specific types for Rabbit data analytics platform
 * Extends base types with YouTube-specific fields and behaviors
 */

import { BaseMediaRecord, BaseFilterOptions } from '../../../packages/core/types'

export interface YouTubeRecord extends BaseMediaRecord {
  platform: 'YouTube'
  product: 'YouTube' | 'YouTube Music'
  channelTitle: string | null
  videoTitle: string | null
  videoId?: string | null
  channelId?: string | null
}

export interface YouTubeFilterOptions extends BaseFilterOptions {
  product?: 'All' | 'YouTube' | 'YouTube Music'
}

export interface YouTubeParserConfig {
  platform: 'YouTube'
  version: string
  supportedFormats: ['html', 'json']
  maxFileSize: 50 * 1024 * 1024 // 50MB
  supportedProducts: ['YouTube', 'YouTube Music']
}

export interface YouTubeAnalytics extends BaseAnalytics {
  totalWatchTime: number
  averageWatchTime: number
  topChannels: Array<{
    name: string
    count: number
    watchTime: number
    percentage: number
  }>
  topVideos: Array<{
    title: string
    channel: string
    count: number
    watchTime: number
  }>
  productBreakdown: {
    youtube: number
    youtubeMusic: number
  }
  viewingPatterns: {
    averageSessionLength: number
    bingeSessions: number
    peakHours: number[]
    peakDays: number[]
  }
}

export interface YouTubeImportSummary {
  totalRecords: number
  successfulRecords: number
  failedRecords: number
  dateRange: {
    start: string | null
    end: string | null
  }
  channels: {
    total: number
    top: Array<{ name: string; count: number }>
  }
  products: {
    youtube: number
    youtubeMusic: number
  }
  topics: {
    total: number
    classified: number
    top: Array<{ name: string; count: number }>
  }
  parseTime: number
  errors: string[]
}
