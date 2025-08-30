import { get, set, del } from 'idb-keyval'
import { WatchRecord, ImportSummary } from '@/types/records'
import { 
  DataConsistencyValidator, 
  createDataConsistencyValidator 
} from './data-consistency-validator'
import { 
  DataConsistencyReport, 
  StorageSystemMetrics, 
  ValidationConfig 
} from '@/types/validation'

export interface HistoricalUploadMetadata {
  uploadedAt: string
  fileName: string
  fileSize: number
  recordCount: number
}

export interface MasterData {
  records: WatchRecord[]
  lastUpdated: string
  totalUploads: number
  metadata: HistoricalUploadMetadata[]
}

export interface PrecomputedAggregations {
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
  yearlyBreakdown: Record<number, number>
  topChannels: Array<{
    name: string
    count: number
  }>
  topTopics: Array<{
    topic: string
    count: number
  }>
  computedAt: string
}

export interface TimeSliceQuery {
  startDate?: Date
  endDate?: Date
  product?: 'YouTube' | 'YouTube Music'
  channels?: string[]
  topics?: string[]
}

export class HistoricalStorage {
  private userId: string
  private validator: DataConsistencyValidator

  constructor(userId: string) {
    this.userId = userId
    this.validator = createDataConsistencyValidator()
  }

  private key(name: string) {
    return `historical:${this.userId}:${name}`
  }

  // Removed remote blob utilities; operating fully locally

  /**
   * Save new upload while preserving historical data
   */
  async saveUpload(
    newRecords: WatchRecord[],
    metadata: HistoricalUploadMetadata,
    summary: ImportSummary
  ): Promise<void> {
    console.log(`Starting saveUpload for ${newRecords.length} records`)
    try {
      const existing = (await get<MasterData>(this.key('master'))) || this.createEmptyMasterData()
      const mergedRecords = this.mergeAndDeduplicateRecords(existing.records, newRecords)

      const updatedMasterData: MasterData = {
        records: mergedRecords,
        lastUpdated: new Date().toISOString(),
        totalUploads: existing.totalUploads + 1,
        metadata: [...existing.metadata, metadata]
      }

      await set(this.key('master'), updatedMasterData)
      const aggregations = this.computeAggregations(mergedRecords)
      await set(this.key('aggregations'), aggregations)
    } catch (error) {
      console.error('Failed to save upload to historical storage:', error)
      throw new Error(`Failed to save historical data: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Query records within a specific time slice
   */
  async queryTimeSlice(query: TimeSliceQuery): Promise<WatchRecord[]> {
    try {
      const master = await get<MasterData>(this.key('master'))
      if (!master) return []
      return this.applyFilters(master.records, query)
    } catch (error) {
      console.error('Failed to query time slice:', error)
      return []
    }
  }

  /**
   * Get precomputed aggregations for fast dashboard loading
   */
  async getPrecomputedAggregations(): Promise<PrecomputedAggregations | null> {
    try {
      const agg = await get<PrecomputedAggregations>(this.key('aggregations'))
      if (agg) return agg
      const master = await get<MasterData>(this.key('master'))
      if (!master) return null
      const computed = this.computeAggregations(master.records)
      await set(this.key('aggregations'), computed)
      return computed
    } catch (error) {
      console.error('Failed to get precomputed aggregations:', error)
      return null
    }
  }

  /**
   * Get upload history and metadata
   */
  async getUploadHistory(): Promise<HistoricalUploadMetadata[]> {
    try {
      const master = await get<MasterData>(this.key('master'))
      return master?.metadata || []
    } catch (error) {
      console.error('Failed to get upload history:', error)
      return []
    }
  }

  private createEmptyMasterData(): MasterData {
    return {
      records: [],
      lastUpdated: new Date().toISOString(),
      totalUploads: 0,
      metadata: []
    }
  }

  private mergeAndDeduplicateRecords(existing: WatchRecord[], newRecords: WatchRecord[]): WatchRecord[] {
    const idSet = new Set(existing.map(r => r.id))
    const uniqueNewRecords = newRecords.filter(r => !idSet.has(r.id))
    
    const merged = [...existing, ...uniqueNewRecords]
    
    // Sort by timestamp (newest first)
    return merged.sort((a, b) => {
      if (!a.watchedAt) return 1
      if (!b.watchedAt) return -1
      return new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime()
    })
  }

  private computeAggregations(records: WatchRecord[]): PrecomputedAggregations {
    const uniqueChannels = new Set(records.map(r => r.channelTitle).filter(Boolean))
    
    const validDates = records
      .map(r => r.watchedAt ? new Date(r.watchedAt) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
    
    const dateRange = {
      start: validDates.length > 0 ? new Date(Math.min(...validDates.map(d => d.getTime()))) : null,
      end: validDates.length > 0 ? new Date(Math.max(...validDates.map(d => d.getTime()))) : null
    }
    
    const productBreakdown = records.reduce((acc, record) => {
      if (record.product === 'YouTube Music') {
        acc.youtubeMusic++
      } else {
        acc.youtube++
      }
      return acc
    }, { youtube: 0, youtubeMusic: 0 })

    // Yearly breakdown
    const yearlyBreakdown: Record<number, number> = {}
    records.forEach(record => {
      if (record.year) {
        yearlyBreakdown[record.year] = (yearlyBreakdown[record.year] || 0) + 1
      }
    })

    // Top channels
    const channelCounts: Record<string, number> = {}
    records.forEach(record => {
      if (record.channelTitle) {
        channelCounts[record.channelTitle] = (channelCounts[record.channelTitle] || 0) + 1
      }
    })
    
    const topChannels = Object.entries(channelCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    // Top topics
    const topicCounts: Record<string, number> = {}
    records.forEach(record => {
      record.topics.forEach(topic => {
        topicCounts[topic] = (topicCounts[topic] || 0) + 1
      })
    })

    const topTopics = Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([topic, count]) => ({ topic, count }))

    return {
      totalRecords: records.length,
      uniqueChannels: uniqueChannels.size,
      dateRange,
      productBreakdown,
      yearlyBreakdown,
      topChannels,
      topTopics,
      computedAt: new Date().toISOString()
    }
  }

  private applyFilters(records: WatchRecord[], query: TimeSliceQuery): WatchRecord[] {
    let filtered = records
    if (query.startDate || query.endDate) {
      filtered = filtered.filter(r => {
        if (!r.watchedAt) return false
        const d = new Date(r.watchedAt)
        if (query.startDate && d < query.startDate) return false
        if (query.endDate && d > query.endDate) return false
        return true
      })
    }
    if (query.product) {
      filtered = filtered.filter(r => r.product === query.product)
    }
    if (query.channels && query.channels.length > 0) {
      filtered = filtered.filter(r => r.channelTitle && query.channels!.includes(r.channelTitle))
    }
    if (query.topics && query.topics.length > 0) {
      filtered = filtered.filter(r => r.topics.some(t => query.topics!.includes(t)))
    }
    return filtered.sort((a, b) => {
      if (!a.watchedAt) return 1
      if (!b.watchedAt) return -1
      return new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime()
    })
  }

  private generateCacheKey(query: TimeSliceQuery): string {
    const parts = [
      query.startDate?.toISOString().split('T')[0] || 'any',
      query.endDate?.toISOString().split('T')[0] || 'any',
      query.product || 'all',
      query.channels?.sort().join(',') || 'all',
      query.topics?.sort().join(',') || 'all'
    ]
    
    return parts.join('_').replace(/[^a-zA-Z0-9_-]/g, '-')
  }

  /**
   * Invalidate all client-side caches for this user
   */
  async invalidateClientCaches(): Promise<void> {
    try {
      await del(this.key('aggregations'))
      console.log('✅ Cleared local aggregations cache for user:', this.userId)
    } catch (error) {
      console.warn('⚠️ Failed to clear local aggregations cache:', error)
    }
  }

  /**
   * Force refresh of a specific blob by cache busting
   */
  async refreshBlob(_fileName: string): Promise<void> {
    // No-op in local mode
  }

  /**
   * Validate data consistency with session storage
   */
  async validateWithSessionStorage(
    sessionData: WatchRecord[],
    config?: Partial<ValidationConfig>
  ): Promise<DataConsistencyReport> {
    console.log('🔍 Validating historical storage consistency with session data...')
    
    try {
      // Get historical data
      const historicalData = await this.queryTimeSlice({})
      
      // Run validation
      const report = await this.validator.validateConsistency(
        sessionData,
        historicalData,
        config
      )
      
      console.log(`✅ Validation completed: ${report.overallStatus}`)
      console.log(`📊 Found ${report.issues.length} issues, ${report.summary.passedChecks}/${report.summary.totalChecks} checks passed`)
      
      return report
    } catch (error) {
      console.error('❌ Historical storage validation failed:', error)
      throw new Error(`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get data quality metrics for historical storage
   */
  async getDataQualityMetrics(): Promise<StorageSystemMetrics | null> {
    try {
      const data = await this.queryTimeSlice({})
      
      if (data.length === 0) {
        return null
      }
      
      return this.validator.computeStorageMetrics(data, 'historical')
    } catch (error) {
      console.error('Failed to get historical storage metrics:', error)
      return null
    }
  }

  /**
   * Validate data integrity after upload
   */
  async validateAfterUpload(uploadedRecords: WatchRecord[]): Promise<{
    success: boolean
    report?: DataConsistencyReport
    error?: string
  }> {
    try {
      console.log('🔍 Validating data integrity after upload...')
      
      // Get all historical data
      const allHistoricalData = await this.queryTimeSlice({})
      
      // Validate that uploaded records are properly integrated
      const uploadedIds = new Set(uploadedRecords.map(r => r.id))
      const foundRecords = allHistoricalData.filter(r => uploadedIds.has(r.id))
      
      if (foundRecords.length !== uploadedRecords.length) {
        return {
          success: false,
          error: `Upload validation failed: Expected ${uploadedRecords.length} records, found ${foundRecords.length}`
        }
      }
      
      // Run comprehensive validation
      const report = await this.validator.validateConsistency(
        uploadedRecords,
        allHistoricalData,
        {
          recordCountTolerance: 0, // Strict validation after upload
          checksumValidation: true,
          deduplicationCheck: true
        }
      )
      
      const success = report.overallStatus === 'healthy' || report.overallStatus === 'warning'
      
      console.log(`${success ? '✅' : '❌'} Upload validation ${success ? 'passed' : 'failed'}: ${report.overallStatus}`)
      
      return {
        success,
        report
      }
    } catch (error) {
      console.error('❌ Upload validation failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Check for data drift over time
   */
  async checkDataDrift(
    comparisonData: WatchRecord[],
    toleranceConfig?: Partial<ValidationConfig>
  ): Promise<{
    hasDrift: boolean
    driftPercentage: number
    report: DataConsistencyReport
  }> {
    try {
      const historicalData = await this.queryTimeSlice({})
      
      const report = await this.validator.validateConsistency(
        comparisonData,
        historicalData,
        toleranceConfig
      )
      
      // Calculate drift based on failed checks and issues
      const totalChecks = report.summary.totalChecks
      const failedChecks = report.summary.failedChecks + report.summary.warningChecks
      const driftPercentage = totalChecks > 0 ? (failedChecks / totalChecks) * 100 : 0
      
      const hasDrift = driftPercentage > 10 || report.summary.criticalIssues > 0
      
      console.log(`📊 Data drift analysis: ${driftPercentage.toFixed(1)}% drift detected`)
      
      return {
        hasDrift,
        driftPercentage,
        report
      }
    } catch (error) {
      console.error('❌ Data drift check failed:', error)
      throw error
    }
  }

  /**
   * Automated validation check (called periodically)
   */
  async runAutomaticValidation(): Promise<DataConsistencyReport | null> {
    try {
      console.log('🤖 Running automatic validation check...')
      
      const historicalData = await this.queryTimeSlice({})
      
      if (historicalData.length === 0) {
        console.log('📭 No historical data found, skipping validation')
        return null
      }
      
      // Self-validation (check internal consistency)
      const report = await this.validator.validateConsistency(
        historicalData,
        historicalData,
        {
          recordCountTolerance: 0,
          checksumValidation: true,
          deduplicationCheck: true,
          automaticValidation: {
            enabled: true,
            frequency: 30,
            triggerOnDataChange: false
          }
        }
      )
      
      // Log results
      if (report.overallStatus === 'error') {
        console.error('🚨 Automatic validation detected critical issues')
      } else if (report.overallStatus === 'warning') {
        console.warn('⚠️ Automatic validation detected warnings')
      } else {
        console.log('✅ Automatic validation passed')
      }
      
      return report
    } catch (error) {
      console.error('❌ Automatic validation failed:', error)
      return null
    }
  }
}

/**
 * Factory function to create HistoricalStorage instance for authenticated user
 */
export function createHistoricalStorage(userId: string): HistoricalStorage {
  return new HistoricalStorage(userId)
}
