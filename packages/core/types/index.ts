/**
 * Core platform-agnostic types for Rabbit data analytics platform
 * These types define the common interfaces that all platforms must implement
 */

export interface BaseMediaRecord {
  id: string
  title: string | null
  creator: string | null
  platform: string
  consumedAt: string | null
  duration?: number | null
  url?: string | null
  topics: string[]
  
  // Computed fields for analytics
  year: number | null
  month: number | null
  week: number | null
  dayOfWeek: number | null
  hour: number | null
  yoyKey: string | null
}

export interface BaseAnalytics {
  totalRecords: number
  totalDuration: number
  uniqueCreators: number
  uniqueTopics: number
  dateRange: {
    start: string | null
    end: string | null
  }
}

export interface BaseFilterOptions {
  timeframe: 'All' | 'YTD' | 'QTD' | 'MTD' | 'Last6M' | 'Last12M'
  platform?: string
  topics?: string[]
  creators?: string[]
}

export interface BaseParserConfig {
  platform: string
  version: string
  supportedFormats: string[]
  maxFileSize: number
}

export interface BaseParserResult<T extends BaseMediaRecord> {
  records: T[]
  metadata: {
    totalRecords: number
    parseTime: number
    successRate: number
    errors: string[]
  }
  summary: {
    dateRange: {
      start: string | null
      end: string | null
    }
    topCreators: Array<{ name: string; count: number }>
    topTopics: Array<{ name: string; count: number }>
  }
}

export interface BaseStorageProvider {
  save(records: BaseMediaRecord[]): Promise<void>
  load(): Promise<BaseMediaRecord[]>
  clear(): Promise<void>
  export(format: 'json' | 'csv'): Promise<string>
}

export interface BaseAnalyticsProvider {
  computeKPIs(records: BaseMediaRecord[], filters: BaseFilterOptions): BaseAnalytics
  computeTrends(records: BaseMediaRecord[], filters: BaseFilterOptions): any
  computeInsights(records: BaseMediaRecord[], filters: BaseFilterOptions): any
}
