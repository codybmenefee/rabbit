import { WatchRecord } from './records'

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