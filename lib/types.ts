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

// Validation types
export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low'
export type ValidationStatus = 'healthy' | 'warning' | 'error' | 'unknown'
export type StorageSystemType = 'session' | 'historical' | 'both'

export interface ValidationIssue {
  id: string
  severity: ValidationSeverity
  category: string
  message: string
  details?: string
  affectedRecords?: number
  recommendation?: string
  timestamp: string
}

export interface DataQualityMetrics {
  totalRecords: number
  recordsWithValidTimestamps: number
  recordsWithValidTitles: number
  recordsWithValidChannels: number
  recordsWithValidUrls: number
  duplicateRecords: number
  corruptedRecords: number
  timestampFormatConsistency: number // 0-100
  dataCompletenessScore: number // 0-100
  overallQualityScore: number // 0-100
}

export interface StorageSystemMetrics {
  storageType: StorageSystemType
  recordCount: number
  dataSize: number // in bytes
  lastUpdated: Date | null
  firstRecord: Date | null
  lastRecord: Date | null
  uniqueChannels: number
  productBreakdown: {
    youtube: number
    youtubeMusic: number
  }
  qualityMetrics: DataQualityMetrics
  checksum: string // Data integrity checksum
}

export interface ConsistencyCheckResult {
  checkType: string
  status: ValidationStatus
  description: string
  expected?: any
  actual?: any
  difference?: number | string
  tolerance?: number
  severity: ValidationSeverity
  recommendation?: string
}

export interface DataConsistencyReport {
  validationId: string
  timestamp: string
  sessionMetrics: StorageSystemMetrics | null
  historicalMetrics: StorageSystemMetrics | null
  consistencyChecks: ConsistencyCheckResult[]
  overallStatus: ValidationStatus
  issues: ValidationIssue[]
  recommendations: string[]
  validationDuration: number // milliseconds
  summary: {
    totalChecks: number
    passedChecks: number
    failedChecks: number
    warningChecks: number
    criticalIssues: number
    highIssues: number
    mediumIssues: number
    lowIssues: number
  }
}

export interface ValidationConfig {
  recordCountTolerance: number // percentage
  dateRangeTolerance: number // days
  checksumValidation: boolean
  deduplicationCheck: boolean
  dataQualityThresholds: {
    minimumQualityScore: number
    timestampValidityThreshold: number
    completenessThreshold: number
  }
  automaticValidation: {
    enabled: boolean
    frequency: number // minutes
    triggerOnDataChange: boolean
  }
}

export interface ValidationTrigger {
  type: 'manual' | 'automatic' | 'upload' | 'migration' | 'scheduled'
  source: string
  timestamp: string
  metadata?: Record<string, any>
}

export interface ValidationHistoryEntry {
  validationId: string
  timestamp: string
  trigger: ValidationTrigger
  duration: number
  status: ValidationStatus
  issueCount: number
  criticalIssues: number
  summary: string
}

// Validation rules interface
export interface ValidationRule {
  id: string
  name: string
  description: string
  category: string
  enabled: boolean
  severity: ValidationSeverity
  tolerance?: number
  validate: (sessionData: WatchRecord[], historicalData: WatchRecord[]) => ConsistencyCheckResult
}

// Specific validation result types
export interface RecordCountValidation extends ConsistencyCheckResult {
  sessionCount: number
  historicalCount: number
  difference: number
  tolerancePercentage: number
}

export interface DateRangeValidation extends ConsistencyCheckResult {
  sessionRange: { start: Date | null; end: Date | null }
  historicalRange: { start: Date | null; end: Date | null }
  rangeDifferenceDays: number
}

export interface DataQualityValidation extends ConsistencyCheckResult {
  sessionQuality: DataQualityMetrics
  historicalQuality: DataQualityMetrics
  qualityDifference: number
}

export interface DeduplicationValidation extends ConsistencyCheckResult {
  sessionDuplicates: number
  historicalDuplicates: number
  crossSystemDuplicates: number
  potentialMergeConflicts: string[]
}

export interface ChecksumValidation extends ConsistencyCheckResult {
  sessionChecksum: string
  historicalChecksum: string
  checksumMatch: boolean
  suspectedCorruption: boolean
}

// Validation service interface
export interface IDataConsistencyValidator {
  validateConsistency(
    sessionData: WatchRecord[],
    historicalData: WatchRecord[],
    config?: Partial<ValidationConfig>
  ): Promise<DataConsistencyReport>
  
  validateDataQuality(records: WatchRecord[]): DataQualityMetrics
  
  computeStorageMetrics(
    records: WatchRecord[],
    storageType: StorageSystemType
  ): StorageSystemMetrics
  
  generateChecksum(records: WatchRecord[]): string
  
  getValidationHistory(limit?: number): Promise<ValidationHistoryEntry[]>
  
  saveValidationReport(report: DataConsistencyReport): Promise<void>
  
  scheduleValidation(trigger: ValidationTrigger): Promise<string>
}

// Export default validation configuration
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  recordCountTolerance: 5, // 5% difference allowed
  dateRangeTolerance: 1, // 1 day difference allowed
  checksumValidation: true,
  deduplicationCheck: true,
  dataQualityThresholds: {
    minimumQualityScore: 85,
    timestampValidityThreshold: 95,
    completenessThreshold: 90
  },
  automaticValidation: {
    enabled: true,
    frequency: 30, // 30 minutes
    triggerOnDataChange: true
  }
}
