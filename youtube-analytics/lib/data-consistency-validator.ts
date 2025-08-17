import { WatchRecord } from '@/types/records'
import {
  IDataConsistencyValidator,
  DataConsistencyReport,
  DataQualityMetrics,
  StorageSystemMetrics,
  ConsistencyCheckResult,
  ValidationIssue,
  ValidationConfig,
  ValidationRule,
  ValidationStatus,
  ValidationSeverity,
  ValidationTrigger,
  ValidationHistoryEntry,
  StorageSystemType,
  RecordCountValidation,
  DateRangeValidation,
  DataQualityValidation,
  DeduplicationValidation,
  ChecksumValidation,
  DEFAULT_VALIDATION_CONFIG
} from '@/types/validation'
// Browser-compatible checksum generation
function createSimpleHash(data: string): string {
  let hash = 0
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

export class DataConsistencyValidator implements IDataConsistencyValidator {
  private config: ValidationConfig
  private validationHistory: ValidationHistoryEntry[] = []

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config }
  }

  async validateConsistency(
    sessionData: WatchRecord[],
    historicalData: WatchRecord[],
    config?: Partial<ValidationConfig>
  ): Promise<DataConsistencyReport> {
    const startTime = Date.now()
    const validationId = this.generateValidationId()
    const effectiveConfig = { ...this.config, ...config }

    console.log(`🔍 Starting data consistency validation: ${validationId}`)

    try {
      // Compute metrics for both storage systems
      const sessionMetrics = sessionData.length > 0 
        ? this.computeStorageMetrics(sessionData, 'session')
        : null
      
      const historicalMetrics = historicalData.length > 0
        ? this.computeStorageMetrics(historicalData, 'historical')
        : null

      // Run all consistency checks
      const consistencyChecks = await this.runConsistencyChecks(
        sessionData,
        historicalData,
        effectiveConfig
      )

      // Analyze issues and generate recommendations
      const issues = this.extractIssues(consistencyChecks)
      const recommendations = this.generateRecommendations(consistencyChecks, issues)
      
      // Determine overall status
      const overallStatus = this.determineOverallStatus(consistencyChecks, issues)

      // Calculate summary statistics
      const summary = {
        totalChecks: consistencyChecks.length,
        passedChecks: consistencyChecks.filter(c => c.status === 'healthy').length,
        failedChecks: consistencyChecks.filter(c => c.status === 'error').length,
        warningChecks: consistencyChecks.filter(c => c.status === 'warning').length,
        criticalIssues: issues.filter(i => i.severity === 'critical').length,
        highIssues: issues.filter(i => i.severity === 'high').length,
        mediumIssues: issues.filter(i => i.severity === 'medium').length,
        lowIssues: issues.filter(i => i.severity === 'low').length
      }

      const validationDuration = Date.now() - startTime

      const report: DataConsistencyReport = {
        validationId,
        timestamp: new Date().toISOString(),
        sessionMetrics,
        historicalMetrics,
        consistencyChecks,
        overallStatus,
        issues,
        recommendations,
        validationDuration,
        summary
      }

      await this.saveValidationReport(report)
      
      console.log(`✅ Data consistency validation completed: ${validationId} (${validationDuration}ms)`)
      console.log(`📊 Summary: ${summary.passedChecks}/${summary.totalChecks} checks passed, ${issues.length} issues found`)

      return report

    } catch (error) {
      console.error(`❌ Data consistency validation failed: ${validationId}`, error)
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  validateDataQuality(records: WatchRecord[]): DataQualityMetrics {
    const totalRecords = records.length
    
    if (totalRecords === 0) {
      return {
        totalRecords: 0,
        recordsWithValidTimestamps: 0,
        recordsWithValidTitles: 0,
        recordsWithValidChannels: 0,
        recordsWithValidUrls: 0,
        duplicateRecords: 0,
        corruptedRecords: 0,
        timestampFormatConsistency: 100,
        dataCompletenessScore: 100,
        overallQualityScore: 100
      }
    }

    // Validate timestamps
    const recordsWithValidTimestamps = records.filter(r => 
      r.watchedAt && this.isValidTimestamp(r.watchedAt)
    ).length

    // Validate titles
    const recordsWithValidTitles = records.filter(r =>
      r.videoTitle && r.videoTitle.trim().length > 0
    ).length

    // Validate channels
    const recordsWithValidChannels = records.filter(r =>
      r.channelTitle && r.channelTitle.trim().length > 0
    ).length

    // Validate URLs
    const recordsWithValidUrls = records.filter(r =>
      r.videoUrl && this.isValidUrl(r.videoUrl)
    ).length

    // Detect duplicates
    const duplicateRecords = this.countDuplicates(records)

    // Detect corrupted records (missing critical fields)
    const corruptedRecords = records.filter(r =>
      !r.id || (!r.videoTitle && !r.channelTitle) || 
      (r.watchedAt && !this.isValidTimestamp(r.watchedAt))
    ).length

    // Calculate timestamp format consistency
    const timestampFormats = new Set(
      records
        .filter(r => r.watchedAt)
        .map(r => this.getTimestampFormat(r.watchedAt!))
    )
    const timestampFormatConsistency = timestampFormats.size <= 1 ? 100 : 
      Math.max(0, 100 - (timestampFormats.size - 1) * 20)

    // Calculate data completeness score
    const completenessFactors = [
      recordsWithValidTimestamps / totalRecords,
      recordsWithValidTitles / totalRecords,
      recordsWithValidChannels / totalRecords,
      recordsWithValidUrls / totalRecords
    ]
    const dataCompletenessScore = Math.round(
      completenessFactors.reduce((sum, factor) => sum + factor, 0) / completenessFactors.length * 100
    )

    // Calculate overall quality score
    const qualityFactors = [
      recordsWithValidTimestamps / totalRecords * 0.3, // 30% weight
      recordsWithValidTitles / totalRecords * 0.25,    // 25% weight
      recordsWithValidChannels / totalRecords * 0.25,  // 25% weight
      recordsWithValidUrls / totalRecords * 0.1,       // 10% weight
      (1 - duplicateRecords / totalRecords) * 0.05,    // 5% weight
      (1 - corruptedRecords / totalRecords) * 0.05     // 5% weight
    ]
    const overallQualityScore = Math.round(
      qualityFactors.reduce((sum, factor) => sum + factor, 0) * 100
    )

    return {
      totalRecords,
      recordsWithValidTimestamps,
      recordsWithValidTitles,
      recordsWithValidChannels,
      recordsWithValidUrls,
      duplicateRecords,
      corruptedRecords,
      timestampFormatConsistency,
      dataCompletenessScore,
      overallQualityScore
    }
  }

  computeStorageMetrics(
    records: WatchRecord[],
    storageType: StorageSystemType
  ): StorageSystemMetrics {
    const qualityMetrics = this.validateDataQuality(records)
    const checksum = this.generateChecksum(records)

    // Calculate data size estimate
    const avgRecordSize = 512 // bytes per record estimate
    const dataSize = records.length * avgRecordSize

    // Find date range
    const validDates = records
      .map(r => r.watchedAt ? new Date(r.watchedAt) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))

    const firstRecord = validDates.length > 0 
      ? new Date(Math.min(...validDates.map(d => d.getTime()))) 
      : null
    const lastRecord = validDates.length > 0 
      ? new Date(Math.max(...validDates.map(d => d.getTime()))) 
      : null

    // Count unique channels
    const uniqueChannels = new Set(
      records.map(r => r.channelTitle).filter(Boolean)
    ).size

    // Product breakdown
    const productBreakdown = records.reduce((acc, record) => {
      if (record.product === 'YouTube Music') {
        acc.youtubeMusic++
      } else {
        acc.youtube++
      }
      return acc
    }, { youtube: 0, youtubeMusic: 0 })

    return {
      storageType,
      recordCount: records.length,
      dataSize,
      lastUpdated: new Date(),
      firstRecord,
      lastRecord,
      uniqueChannels,
      productBreakdown,
      qualityMetrics,
      checksum
    }
  }

  generateChecksum(records: WatchRecord[]): string {
    // Sort records by ID for consistent checksum
    const sortedRecords = [...records].sort((a, b) => a.id.localeCompare(b.id))
    
    // Create checksum based on critical fields
    const checksumData = sortedRecords.map(record => ({
      id: record.id,
      watchedAt: record.watchedAt,
      videoTitle: record.videoTitle,
      channelTitle: record.channelTitle,
      product: record.product
    }))

    return createSimpleHash(JSON.stringify(checksumData))
  }

  async getValidationHistory(limit: number = 10): Promise<ValidationHistoryEntry[]> {
    return this.validationHistory.slice(-limit).reverse()
  }

  async saveValidationReport(report: DataConsistencyReport): Promise<void> {
    // Add to history
    const historyEntry: ValidationHistoryEntry = {
      validationId: report.validationId,
      timestamp: report.timestamp,
      trigger: {
        type: 'manual',
        source: 'DataConsistencyValidator',
        timestamp: report.timestamp
      },
      duration: report.validationDuration,
      status: report.overallStatus,
      issueCount: report.issues.length,
      criticalIssues: report.summary.criticalIssues,
      summary: `${report.summary.passedChecks}/${report.summary.totalChecks} checks passed`
    }

    this.validationHistory.push(historyEntry)

    // Keep only last 50 entries
    if (this.validationHistory.length > 50) {
      this.validationHistory = this.validationHistory.slice(-50)
    }

    // In a real implementation, this would save to persistent storage
    console.log(`💾 Validation report saved: ${report.validationId}`)
  }

  async scheduleValidation(trigger: ValidationTrigger): Promise<string> {
    const validationId = this.generateValidationId()
    console.log(`⏰ Validation scheduled: ${validationId}`, trigger)
    return validationId
  }

  private async runConsistencyChecks(
    sessionData: WatchRecord[],
    historicalData: WatchRecord[],
    config: ValidationConfig
  ): Promise<ConsistencyCheckResult[]> {
    const checks: ConsistencyCheckResult[] = []

    // Record count validation
    checks.push(this.validateRecordCount(sessionData, historicalData, config))

    // Date range validation
    checks.push(this.validateDateRange(sessionData, historicalData, config))

    // Data quality validation
    checks.push(this.validateDataQualityConsistency(sessionData, historicalData))

    // Deduplication validation
    if (config.deduplicationCheck) {
      checks.push(this.validateDeduplication(sessionData, historicalData))
    }

    // Checksum validation
    if (config.checksumValidation) {
      checks.push(this.validateChecksums(sessionData, historicalData))
    }

    // Channel distribution validation
    checks.push(this.validateChannelDistribution(sessionData, historicalData))

    // Product distribution validation
    checks.push(this.validateProductDistribution(sessionData, historicalData))

    return checks
  }

  private validateRecordCount(
    sessionData: WatchRecord[],
    historicalData: WatchRecord[],
    config: ValidationConfig
  ): RecordCountValidation {
    const sessionCount = sessionData.length
    const historicalCount = historicalData.length
    const difference = Math.abs(sessionCount - historicalCount)
    const maxCount = Math.max(sessionCount, historicalCount)
    const differencePercentage = maxCount > 0 ? (difference / maxCount) * 100 : 0

    const status: ValidationStatus = 
      differencePercentage <= config.recordCountTolerance ? 'healthy' :
      differencePercentage <= config.recordCountTolerance * 2 ? 'warning' : 'error'

    const severity: ValidationSeverity =
      differencePercentage <= config.recordCountTolerance ? 'low' :
      differencePercentage <= config.recordCountTolerance * 2 ? 'medium' : 'high'

    return {
      checkType: 'recordCount',
      status,
      description: 'Record count consistency between storage systems',
      sessionCount,
      historicalCount,
      difference,
      tolerancePercentage: config.recordCountTolerance,
      severity,
      expected: sessionCount > historicalCount ? sessionCount : historicalCount,
      actual: sessionCount < historicalCount ? sessionCount : historicalCount,
      recommendation: status !== 'healthy' 
        ? `Consider syncing data between storage systems. Difference: ${difference} records (${differencePercentage.toFixed(1)}%)`
        : undefined
    }
  }

  private validateDateRange(
    sessionData: WatchRecord[],
    historicalData: WatchRecord[],
    config: ValidationConfig
  ): DateRangeValidation {
    const getDateRange = (records: WatchRecord[]) => {
      const validDates = records
        .map(r => r.watchedAt ? new Date(r.watchedAt) : null)
        .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
      
      return {
        start: validDates.length > 0 ? new Date(Math.min(...validDates.map(d => d.getTime()))) : null,
        end: validDates.length > 0 ? new Date(Math.max(...validDates.map(d => d.getTime()))) : null
      }
    }

    const sessionRange = getDateRange(sessionData)
    const historicalRange = getDateRange(historicalData)

    let rangeDifferenceDays = 0
    if (sessionRange.start && sessionRange.end && historicalRange.start && historicalRange.end) {
      const sessionSpan = sessionRange.end.getTime() - sessionRange.start.getTime()
      const historicalSpan = historicalRange.end.getTime() - historicalRange.start.getTime()
      rangeDifferenceDays = Math.abs(sessionSpan - historicalSpan) / (1000 * 60 * 60 * 24)
    }

    const status: ValidationStatus = 
      rangeDifferenceDays <= config.dateRangeTolerance ? 'healthy' :
      rangeDifferenceDays <= config.dateRangeTolerance * 3 ? 'warning' : 'error'

    return {
      checkType: 'dateRange',
      status,
      description: 'Date range consistency between storage systems',
      sessionRange,
      historicalRange,
      rangeDifferenceDays,
      severity: status === 'healthy' ? 'low' : status === 'warning' ? 'medium' : 'high',
      recommendation: status !== 'healthy' 
        ? `Date ranges differ by ${rangeDifferenceDays.toFixed(1)} days. Check for missing data.`
        : undefined
    }
  }

  private validateDataQualityConsistency(
    sessionData: WatchRecord[],
    historicalData: WatchRecord[]
  ): DataQualityValidation {
    const sessionQuality = this.validateDataQuality(sessionData)
    const historicalQuality = this.validateDataQuality(historicalData)
    
    const qualityDifference = Math.abs(
      sessionQuality.overallQualityScore - historicalQuality.overallQualityScore
    )

    const status: ValidationStatus = 
      qualityDifference <= 5 ? 'healthy' :
      qualityDifference <= 15 ? 'warning' : 'error'

    return {
      checkType: 'dataQuality',
      status,
      description: 'Data quality consistency between storage systems',
      sessionQuality,
      historicalQuality,
      qualityDifference,
      severity: status === 'healthy' ? 'low' : status === 'warning' ? 'medium' : 'high',
      recommendation: status !== 'healthy' 
        ? `Data quality differs by ${qualityDifference.toFixed(1)} points. Review data integrity.`
        : undefined
    }
  }

  private validateDeduplication(
    sessionData: WatchRecord[],
    historicalData: WatchRecord[]
  ): DeduplicationValidation {
    const sessionDuplicates = this.countDuplicates(sessionData)
    const historicalDuplicates = this.countDuplicates(historicalData)
    
    // Find cross-system duplicates
    const sessionIds = new Set(sessionData.map(r => r.id))
    const historicalIds = new Set(historicalData.map(r => r.id))
    const crossSystemDuplicates = [...sessionIds].filter(id => historicalIds.has(id)).length

    const potentialMergeConflicts: string[] = []
    if (crossSystemDuplicates > 0) {
      potentialMergeConflicts.push(`${crossSystemDuplicates} records exist in both systems`)
    }

    const totalDuplicates = sessionDuplicates + historicalDuplicates + crossSystemDuplicates
    const status: ValidationStatus = totalDuplicates === 0 ? 'healthy' : 
      totalDuplicates <= 10 ? 'warning' : 'error'

    return {
      checkType: 'deduplication',
      status,
      description: 'Duplicate record detection across storage systems',
      sessionDuplicates,
      historicalDuplicates,
      crossSystemDuplicates,
      potentialMergeConflicts,
      severity: status === 'healthy' ? 'low' : status === 'warning' ? 'medium' : 'high',
      recommendation: status !== 'healthy' 
        ? 'Run deduplication process to clean up duplicate records'
        : undefined
    }
  }

  private validateChecksums(
    sessionData: WatchRecord[],
    historicalData: WatchRecord[]
  ): ChecksumValidation {
    const sessionChecksum = this.generateChecksum(sessionData)
    const historicalChecksum = this.generateChecksum(historicalData)
    const checksumMatch = sessionChecksum === historicalChecksum
    
    // If checksums don't match but record counts are identical, suspect corruption
    const suspectedCorruption = !checksumMatch && 
      sessionData.length === historicalData.length && 
      sessionData.length > 0

    const status: ValidationStatus = checksumMatch ? 'healthy' : 
      suspectedCorruption ? 'error' : 'warning'

    return {
      checkType: 'checksum',
      status,
      description: 'Data integrity checksum validation',
      sessionChecksum,
      historicalChecksum,
      checksumMatch,
      suspectedCorruption,
      severity: suspectedCorruption ? 'critical' : checksumMatch ? 'low' : 'medium',
      recommendation: !checksumMatch 
        ? 'Data differs between systems. Consider running integrity check.'
        : undefined
    }
  }

  private validateChannelDistribution(
    sessionData: WatchRecord[],
    historicalData: WatchRecord[]
  ): ConsistencyCheckResult {
    const getTopChannels = (records: WatchRecord[]) => {
      const channelCounts: Record<string, number> = {}
      records.forEach(r => {
        if (r.channelTitle) {
          channelCounts[r.channelTitle] = (channelCounts[r.channelTitle] || 0) + 1
        }
      })
      return Object.entries(channelCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([channel, count]) => ({ channel, count }))
    }

    const sessionChannels = getTopChannels(sessionData)
    const historicalChannels = getTopChannels(historicalData)

    // Compare top 5 channels
    const topSessionChannels = sessionChannels.slice(0, 5).map(c => c.channel)
    const topHistoricalChannels = historicalChannels.slice(0, 5).map(c => c.channel)
    
    const channelOverlap = topSessionChannels.filter(c => 
      topHistoricalChannels.includes(c)
    ).length

    const overlapPercentage = topSessionChannels.length > 0 
      ? (channelOverlap / Math.min(topSessionChannels.length, 5)) * 100 
      : 100

    const status: ValidationStatus = overlapPercentage >= 80 ? 'healthy' :
      overlapPercentage >= 60 ? 'warning' : 'error'

    return {
      checkType: 'channelDistribution',
      status,
      description: 'Top channel consistency between storage systems',
      expected: topHistoricalChannels,
      actual: topSessionChannels,
      difference: 100 - overlapPercentage,
      severity: status === 'healthy' ? 'low' : status === 'warning' ? 'medium' : 'high',
      recommendation: status !== 'healthy' 
        ? `Only ${overlapPercentage.toFixed(1)}% overlap in top channels. Check for data differences.`
        : undefined
    }
  }

  private validateProductDistribution(
    sessionData: WatchRecord[],
    historicalData: WatchRecord[]
  ): ConsistencyCheckResult {
    const getProductBreakdown = (records: WatchRecord[]) => {
      return records.reduce((acc, record) => {
        if (record.product === 'YouTube Music') {
          acc.youtubeMusic++
        } else {
          acc.youtube++
        }
        return acc
      }, { youtube: 0, youtubeMusic: 0 })
    }

    const sessionBreakdown = getProductBreakdown(sessionData)
    const historicalBreakdown = getProductBreakdown(historicalData)

    const sessionMusicPercentage = sessionData.length > 0 
      ? (sessionBreakdown.youtubeMusic / sessionData.length) * 100 
      : 0
    
    const historicalMusicPercentage = historicalData.length > 0 
      ? (historicalBreakdown.youtubeMusic / historicalData.length) * 100 
      : 0

    const difference = Math.abs(sessionMusicPercentage - historicalMusicPercentage)

    const status: ValidationStatus = difference <= 5 ? 'healthy' :
      difference <= 15 ? 'warning' : 'error'

    return {
      checkType: 'productDistribution',
      status,
      description: 'Product type distribution consistency',
      expected: historicalBreakdown,
      actual: sessionBreakdown,
      difference,
      severity: status === 'healthy' ? 'low' : status === 'warning' ? 'medium' : 'high',
      recommendation: status !== 'healthy' 
        ? `Product distribution differs by ${difference.toFixed(1)}%. Check for incomplete data.`
        : undefined
    }
  }

  // Utility methods
  private extractIssues(checks: ConsistencyCheckResult[]): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    checks.forEach((check, index) => {
      if (check.status === 'error' || check.status === 'warning') {
        issues.push({
          id: `issue-${index}`,
          severity: check.severity,
          category: check.checkType,
          message: check.description,
          details: check.recommendation,
          recommendation: check.recommendation,
          timestamp: new Date().toISOString()
        })
      }
    })

    return issues
  }

  private generateRecommendations(
    checks: ConsistencyCheckResult[],
    issues: ValidationIssue[]
  ): string[] {
    const recommendations: string[] = []

    // Critical issues first
    const criticalIssues = issues.filter(i => i.severity === 'critical')
    if (criticalIssues.length > 0) {
      recommendations.push('🚨 Address critical data integrity issues immediately')
    }

    // High priority issues
    const highIssues = issues.filter(i => i.severity === 'high')
    if (highIssues.length > 0) {
      recommendations.push('⚠️ Resolve high priority data consistency issues')
    }

    // Specific recommendations based on check types
    const failedChecks = checks.filter(c => c.status === 'error')
    if (failedChecks.some(c => c.checkType === 'recordCount')) {
      recommendations.push('📊 Sync data between storage systems to resolve record count differences')
    }

    if (failedChecks.some(c => c.checkType === 'checksum')) {
      recommendations.push('🔍 Run data integrity verification and repair corrupted records')
    }

    if (failedChecks.some(c => c.checkType === 'deduplication')) {
      recommendations.push('🔄 Execute deduplication process to clean up duplicate records')
    }

    // General recommendations
    if (issues.length === 0) {
      recommendations.push('✅ Data consistency is healthy across all storage systems')
    } else {
      recommendations.push('🔧 Review validation report and implement suggested fixes')
    }

    return recommendations
  }

  private determineOverallStatus(
    checks: ConsistencyCheckResult[],
    issues: ValidationIssue[]
  ): ValidationStatus {
    const criticalIssues = issues.filter(i => i.severity === 'critical')
    const highIssues = issues.filter(i => i.severity === 'high')
    const errorChecks = checks.filter(c => c.status === 'error')
    const warningChecks = checks.filter(c => c.status === 'warning')

    if (criticalIssues.length > 0 || errorChecks.length >= 3) {
      return 'error'
    }

    if (highIssues.length > 0 || errorChecks.length > 0 || warningChecks.length >= 3) {
      return 'warning'
    }

    if (warningChecks.length > 0) {
      return 'warning'
    }

    return 'healthy'
  }

  private generateValidationId(): string {
    return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private isValidTimestamp(timestamp: string): boolean {
    const date = new Date(timestamp)
    return !isNaN(date.getTime()) && date.getFullYear() >= 2005 && date.getFullYear() <= new Date().getFullYear()
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return url.includes('youtube.com') || url.includes('music.youtube.com')
    } catch {
      return false
    }
  }

  private getTimestampFormat(timestamp: string): string {
    // Simplified format detection
    if (timestamp.includes('T') && timestamp.includes('Z')) return 'ISO'
    if (timestamp.includes('/')) return 'US'
    if (timestamp.includes('-') && timestamp.includes(':')) return 'EU'
    return 'UNKNOWN'
  }

  private countDuplicates(records: WatchRecord[]): number {
    const seen = new Set<string>()
    let duplicates = 0
    
    for (const record of records) {
      if (seen.has(record.id)) {
        duplicates++
      } else {
        seen.add(record.id)
      }
    }
    
    return duplicates
  }
}

// Factory function for creating validator instances
export function createDataConsistencyValidator(
  config?: Partial<ValidationConfig>
): DataConsistencyValidator {
  return new DataConsistencyValidator(config)
}

// Export singleton instance for app-wide use
export const dataConsistencyValidator = new DataConsistencyValidator()