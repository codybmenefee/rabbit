import { get, set, del, keys } from 'idb-keyval'
import { WatchRecord, StorageMetadata, ImportSummary } from '@/types/records'
import { 
  DataConsistencyValidator, 
  createDataConsistencyValidator 
} from './data-consistency-validator'
import { 
  DataConsistencyReport, 
  StorageSystemMetrics, 
  ValidationConfig,
  DataQualityMetrics 
} from '@/types/validation'

const STORAGE_KEYS = {
  RECORDS: 'youtube-analytics:records',
  METADATA: 'youtube-analytics:metadata',
  SUMMARY: 'youtube-analytics:summary'
} as const

export class WatchHistoryStorage {
  private validator: DataConsistencyValidator

  constructor() {
    this.validator = createDataConsistencyValidator()
  }

  private isIndexedDBAvailable(): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      // Check if IndexedDB is available
      if (!('indexedDB' in window)) return false
      
      // Check if we can actually use it (some browsers disable it in private mode)
      const testName = 'idb-test-' + Date.now()
      const request = window.indexedDB.open(testName, 1)
      
      // Clean up the test database
      request.onsuccess = () => {
        request.result.close()
        window.indexedDB.deleteDatabase(testName)
      }
      
      return true
    } catch (error) {
      console.warn('IndexedDB availability check failed:', error)
      return false
    }
  }

  private handleStorageError(error: unknown, operation: string): never {
    const err = error as Error
    
    // Specific error handling for different scenarios
    if (err.name === 'QuotaExceededError') {
      throw new Error(`Storage quota exceeded while ${operation}. Please clear some browser data and try again.`)
    }
    
    if (err.name === 'InvalidStateError') {
      throw new Error(`Storage not available while ${operation}. This often happens in private browsing mode.`)
    }
    
    if (err.name === 'NotAllowedError') {
      throw new Error(`Storage access denied while ${operation}. Please check browser permissions.`)
    }
    
    if (err.name === 'DataError') {
      throw new Error(`Invalid data format while ${operation}. The data may be corrupted.`)
    }
    
    if (err.name === 'AbortError') {
      throw new Error(`Storage operation aborted while ${operation}. Please try again.`)
    }
    
    // Generic fallback
    console.error(`Storage error during ${operation}:`, error)
    throw new Error(`Failed to ${operation}. ${err.message || 'Unknown storage error'}`)
  }

  private async saveToLocalStorage(key: string, data: any): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      if ((error as Error).name === 'QuotaExceededError') {
        throw new Error('Browser storage quota exceeded. Please clear some data and try again.')
      }
      throw error
    }
  }

  private getFromLocalStorage<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : null
    } catch (error) {
      console.warn('Failed to parse localStorage item:', key, error)
      return null
    }
  }

  async saveRecords(
    records: WatchRecord[], 
    metadata: Omit<StorageMetadata, 'recordCount'>,
    summary: ImportSummary
  ): Promise<void> {
    const fullMetadata: StorageMetadata = {
      ...metadata,
      recordCount: records.length
    }

    if (!this.isIndexedDBAvailable()) {
      console.warn('IndexedDB not available, falling back to localStorage')
      await Promise.all([
        this.saveToLocalStorage(STORAGE_KEYS.RECORDS, records),
        this.saveToLocalStorage(STORAGE_KEYS.METADATA, fullMetadata),
        this.saveToLocalStorage(STORAGE_KEYS.SUMMARY, summary)
      ])
      return
    }

    try {
      await Promise.all([
        set(STORAGE_KEYS.RECORDS, records),
        set(STORAGE_KEYS.METADATA, fullMetadata),
        set(STORAGE_KEYS.SUMMARY, summary)
      ])
    } catch (error) {
      this.handleStorageError(error, 'save records')
    }
  }

  async getRecords(): Promise<WatchRecord[]> {
    if (!this.isIndexedDBAvailable()) {
      return this.getFromLocalStorage<WatchRecord[]>(STORAGE_KEYS.RECORDS) || []
    }

    try {
      const records = await get<WatchRecord[]>(STORAGE_KEYS.RECORDS)
      return records || []
    } catch (error) {
      console.warn('Failed to retrieve records from IndexedDB, trying localStorage:', error)
      return this.getFromLocalStorage<WatchRecord[]>(STORAGE_KEYS.RECORDS) || []
    }
  }

  async getMetadata(): Promise<StorageMetadata | null> {
    if (!this.isIndexedDBAvailable()) {
      return this.getFromLocalStorage<StorageMetadata>(STORAGE_KEYS.METADATA)
    }

    try {
      return await get<StorageMetadata>(STORAGE_KEYS.METADATA) || null
    } catch (error) {
      console.warn('Failed to retrieve metadata from IndexedDB, trying localStorage:', error)
      return this.getFromLocalStorage<StorageMetadata>(STORAGE_KEYS.METADATA)
    }
  }

  async getSummary(): Promise<ImportSummary | null> {
    if (!this.isIndexedDBAvailable()) {
      return this.getFromLocalStorage<ImportSummary>(STORAGE_KEYS.SUMMARY)
    }

    try {
      return await get<ImportSummary>(STORAGE_KEYS.SUMMARY) || null
    } catch (error) {
      console.warn('Failed to retrieve summary from IndexedDB, trying localStorage:', error)
      return this.getFromLocalStorage<ImportSummary>(STORAGE_KEYS.SUMMARY)
    }
  }

  async hasData(): Promise<boolean> {
    try {
      const records = await this.getRecords()
      return records.length > 0
    } catch (error) {
      return false
    }
  }

  async clearAll(): Promise<void> {
    try {
      await Promise.all([
        del(STORAGE_KEYS.RECORDS),
        del(STORAGE_KEYS.METADATA),
        del(STORAGE_KEYS.SUMMARY)
      ])
    } catch (error) {
      this.handleStorageError(error, 'clear all data')
    }
  }

  async getStorageInfo(): Promise<{
    keys: string[]
    hasRecords: boolean
    recordCount: number
    lastImported: string | null
  }> {
    try {
      const allKeys = await keys()
      const hasRecords = await this.hasData()
      const records = await this.getRecords()
      const metadata = await this.getMetadata()

      return {
        keys: allKeys.map(String),
        hasRecords,
        recordCount: records.length,
        lastImported: metadata?.importedAt || null
      }
    } catch (error) {
      console.error('Failed to get storage info:', error)
      return {
        keys: [],
        hasRecords: false,
        recordCount: 0,
        lastImported: null
      }
    }
  }

  async exportData(): Promise<{
    records: WatchRecord[]
    metadata: StorageMetadata | null
    summary: ImportSummary | null
  }> {
    const [records, metadata, summary] = await Promise.all([
      this.getRecords(),
      this.getMetadata(),
      this.getSummary()
    ])

    return { records, metadata, summary }
  }

  async importData(data: {
    records: WatchRecord[]
    metadata: StorageMetadata
    summary: ImportSummary
  }): Promise<void> {
    await this.clearAll()
    await this.saveRecords(data.records, data.metadata, data.summary)
  }

  /**
   * Validate data consistency with historical storage
   */
  async validateWithHistoricalStorage(
    historicalData: WatchRecord[],
    config?: Partial<ValidationConfig>
  ): Promise<DataConsistencyReport> {
    console.log('🔍 Validating session storage consistency with historical data...')
    
    try {
      // Get session data
      const sessionData = await this.getRecords()
      
      // Run validation
      const report = await this.validator.validateConsistency(
        sessionData,
        historicalData,
        config
      )
      
      console.log(`✅ Session validation completed: ${report.overallStatus}`)
      console.log(`📊 Found ${report.issues.length} issues, ${report.summary.passedChecks}/${report.summary.totalChecks} checks passed`)
      
      return report
    } catch (error) {
      console.error('❌ Session storage validation failed:', error)
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get data quality metrics for session storage
   */
  async getDataQualityMetrics(): Promise<StorageSystemMetrics | null> {
    try {
      const records = await this.getRecords()
      
      if (records.length === 0) {
        return null
      }
      
      return this.validator.computeStorageMetrics(records, 'session')
    } catch (error) {
      console.error('Failed to get session storage metrics:', error)
      return null
    }
  }

  /**
   * Validate data integrity before save
   */
  async validateBeforeSave(
    records: WatchRecord[], 
    metadata: Omit<StorageMetadata, 'recordCount'>,
    summary: ImportSummary
  ): Promise<{
    success: boolean
    report?: DataConsistencyReport
    error?: string
    warnings?: string[]
  }> {
    try {
      console.log('🔍 Validating data before save...')
      
      // Get existing data
      const existingRecords = await this.getRecords()
      
      // Basic validation
      const warnings: string[] = []
      
      // Check for significant data changes
      if (existingRecords.length > 0) {
        const sizeDifference = Math.abs(records.length - existingRecords.length)
        const sizeDifferencePercentage = (sizeDifference / Math.max(records.length, existingRecords.length)) * 100
        
        if (sizeDifferencePercentage > 50) {
          warnings.push(`Large data size change detected: ${sizeDifferencePercentage.toFixed(1)}% difference`)
        }
      }
      
      // Validate data quality
      const qualityMetrics = this.validator.validateDataQuality(records)
      
      if (qualityMetrics.overallQualityScore < 80) {
        warnings.push(`Low data quality score: ${qualityMetrics.overallQualityScore}/100`)
      }
      
      if (qualityMetrics.duplicateRecords > 0) {
        warnings.push(`${qualityMetrics.duplicateRecords} duplicate records detected`)
      }
      
      if (qualityMetrics.corruptedRecords > 0) {
        warnings.push(`${qualityMetrics.corruptedRecords} corrupted records detected`)
      }
      
      // Run consistency check against existing data if available
      let report: DataConsistencyReport | undefined
      if (existingRecords.length > 0) {
        report = await this.validator.validateConsistency(
          records,
          existingRecords,
          {
            recordCountTolerance: 10, // Allow larger changes during import
            checksumValidation: false, // Don't validate checksum during save
            deduplicationCheck: true
          }
        )
      }
      
      const success = warnings.length === 0 && (!report || report.overallStatus !== 'error')
      
      console.log(`${success ? '✅' : '⚠️'} Pre-save validation ${success ? 'passed' : 'completed with warnings'}`)
      if (warnings.length > 0) {
        console.warn('⚠️ Validation warnings:', warnings)
      }
      
      return {
        success,
        report,
        warnings: warnings.length > 0 ? warnings : undefined
      }
    } catch (error) {
      console.error('❌ Pre-save validation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check for data freshness and staleness
   */
  async checkDataFreshness(): Promise<{
    isStale: boolean
    daysSinceUpdate: number
    recommendations: string[]
  }> {
    try {
      const metadata = await this.getMetadata()
      const recommendations: string[] = []
      
      if (!metadata) {
        return {
          isStale: true,
          daysSinceUpdate: Infinity,
          recommendations: ['No data found in session storage']
        }
      }
      
      const lastUpdate = new Date(metadata.importedAt)
      const now = new Date()
      const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
      
      const isStale = daysSinceUpdate > 7 // Consider stale after 7 days
      
      if (isStale) {
        recommendations.push('Data is stale - consider refreshing with latest Google Takeout export')
      }
      
      if (daysSinceUpdate > 30) {
        recommendations.push('Data is very old - YouTube viewing patterns may have changed significantly')
      }
      
      if (daysSinceUpdate > 1) {
        recommendations.push('Consider syncing to historical storage for persistence')
      }
      
      return {
        isStale,
        daysSinceUpdate,
        recommendations
      }
    } catch (error) {
      console.error('Failed to check data freshness:', error)
      return {
        isStale: true,
        daysSinceUpdate: Infinity,
        recommendations: ['Unable to determine data freshness']
      }
    }
  }

  /**
   * Quick data integrity check
   */
  async quickIntegrityCheck(): Promise<{
    isHealthy: boolean
    issues: string[]
    qualityScore: number
  }> {
    try {
      const records = await this.getRecords()
      const issues: string[] = []
      
      if (records.length === 0) {
        return {
          isHealthy: false,
          issues: ['No data found'],
          qualityScore: 0
        }
      }
      
      const qualityMetrics = this.validator.validateDataQuality(records)
      
      // Check for critical issues
      if (qualityMetrics.recordsWithValidTimestamps / qualityMetrics.totalRecords < 0.9) {
        issues.push(`${((1 - qualityMetrics.recordsWithValidTimestamps / qualityMetrics.totalRecords) * 100).toFixed(1)}% of records have invalid timestamps`)
      }
      
      if (qualityMetrics.recordsWithValidTitles / qualityMetrics.totalRecords < 0.95) {
        issues.push(`${((1 - qualityMetrics.recordsWithValidTitles / qualityMetrics.totalRecords) * 100).toFixed(1)}% of records have missing titles`)
      }
      
      if (qualityMetrics.duplicateRecords > 0) {
        issues.push(`${qualityMetrics.duplicateRecords} duplicate records found`)
      }
      
      if (qualityMetrics.corruptedRecords > 0) {
        issues.push(`${qualityMetrics.corruptedRecords} corrupted records found`)
      }
      
      const isHealthy = issues.length === 0 && qualityMetrics.overallQualityScore >= 90
      
      return {
        isHealthy,
        issues,
        qualityScore: qualityMetrics.overallQualityScore
      }
    } catch (error) {
      console.error('Quick integrity check failed:', error)
      return {
        isHealthy: false,
        issues: ['Integrity check failed'],
        qualityScore: 0
      }
    }
  }
}

export const watchHistoryStorage = new WatchHistoryStorage()