import { head } from '@vercel/blob'
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
  private baseUrl: string
  private validator: DataConsistencyValidator

  constructor(userId: string) {
    this.userId = userId
    this.validator = createDataConsistencyValidator()
    
    // Dynamically determine base URL with better fallback logic
    if (typeof window !== 'undefined') {
      // Client-side: use current origin
      this.baseUrl = window.location.origin
    } else {
      // Server-side: use environment variables with proper handling
      if (process.env.NEXTAUTH_URL) {
        this.baseUrl = process.env.NEXTAUTH_URL
      } else if (process.env.VERCEL_URL) {
        // VERCEL_URL doesn't include protocol, add it
        this.baseUrl = `https://${process.env.VERCEL_URL}`
      } else {
        this.baseUrl = 'http://localhost:3000'
      }
    }
    
    console.log(`HistoricalStorage initialized with baseUrl: ${this.baseUrl}`)
  }

  private getBlobPath(fileName: string): string {
    return `users/${this.userId}/${fileName}`
  }

  private async uploadBlob(path: string, data: any, retries: number = 3): Promise<string> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const response = await fetch('/api/blob/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path, data }),
          signal: AbortSignal.timeout(30000) // 30 second timeout
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          
          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            throw new Error(`Upload failed: ${errorData.error || response.statusText}`)
          }
          
          // Retry on server errors (5xx)
          lastError = new Error(`Upload failed (${response.status}): ${errorData.error || response.statusText}`)
          
          if (attempt < retries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000) // Exponential backoff with max 10s
            console.log(`Retrying upload in ${delay}ms (attempt ${attempt + 1}/${retries})`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        } else {
          const result = await response.json()
          return result.url
        }
      } catch (error: any) {
        lastError = error
        
        // Don't retry on abort/timeout
        if (error.name === 'AbortError') {
          throw new Error('Upload timeout: Request took too long')
        }
        
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          console.log(`Retrying upload after error in ${delay}ms (attempt ${attempt + 1}/${retries})`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
    }
    
    throw lastError || new Error('Upload failed after retries')
  }

  private async downloadBlob<T>(apiUrl: string, useCache: boolean = false, retries: number = 3): Promise<T | null> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        console.log(`Fetching blob URL from API: ${apiUrl} (attempt ${attempt + 1}/${retries})`)
        
        // Configure fetch with cache control and timeout
        const fetchOptions: RequestInit = {
          method: 'GET',
          headers: {
            'Cache-Control': useCache ? 'max-age=300' : 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
          signal: AbortSignal.timeout(20000) // 20 second timeout
        }
        
        // First, get the blob URL from our API
        const apiResponse = await fetch(apiUrl, fetchOptions)
        
        if (!apiResponse.ok) {
          const errorData = await apiResponse.json().catch(() => ({ error: 'Unknown error' }))
          
          // Handle 404 - blob doesn't exist (don't retry)
          if (apiResponse.status === 404) {
            console.log('Blob not found (404)')
            return null
          }
          
          // Don't retry on client errors (4xx)
          if (apiResponse.status >= 400 && apiResponse.status < 500) {
            console.warn(`Client error getting blob URL: ${apiResponse.status} - ${errorData.error || apiResponse.statusText}`)
            return null
          }
          
          // Retry on server errors (5xx)
          lastError = new Error(`API error (${apiResponse.status}): ${errorData.error || apiResponse.statusText}`)
          
          if (attempt < retries - 1) {
            const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
            console.log(`Retrying API call in ${delay}ms`)
            await new Promise(resolve => setTimeout(resolve, delay))
            continue
          }
        }
        
        const apiData = await apiResponse.json()
        
        // Check if we got the content directly (new format) or a URL (legacy format)
        if (apiData.content) {
          console.log('Successfully received blob content from API')
          return apiData.content as T
        } else if (apiData.url) {
          // Legacy fallback: fetch from URL (though this may have CORS issues)
          const blobUrl = apiData.url
          console.log('Downloading blob data from URL:', blobUrl)
          
          const blobResponse = await fetch(blobUrl, {
            headers: {
              'Cache-Control': useCache ? 'max-age=300' : 'no-cache, no-store, must-revalidate'
            },
            signal: AbortSignal.timeout(30000)
          })
          
          if (!blobResponse.ok) {
            lastError = new Error(`Failed to download blob: ${blobResponse.status} ${blobResponse.statusText}`)
            
            if (attempt < retries - 1) {
              const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
              console.log(`Retrying blob download in ${delay}ms`)
              await new Promise(resolve => setTimeout(resolve, delay))
              continue
            }
          }
          
          const data = await blobResponse.text()
          const parsed = JSON.parse(data) as T
          console.log('Successfully downloaded and parsed blob data from URL')
          return parsed
        } else {
          console.warn('No content or URL returned from API')
          return null
        }
        
      } catch (error: any) {
        lastError = error
        
        // Don't retry on abort/timeout
        if (error.name === 'AbortError') {
          console.error('Request timeout')
          return null
        }
        
        // Don't retry on JSON parse errors
        if (error instanceof SyntaxError) {
          console.error('Invalid JSON in blob data:', error)
          return null
        }
        
        if (attempt < retries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          console.log(`Retrying after error in ${delay}ms: ${error.message}`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
      }
    }
    
    console.error('Failed to download blob after retries:', lastError)
    return null
  }

  private async blobExists(path: string): Promise<boolean> {
    try {
      await head(path, {
        token: process.env.BLOB_READ_WRITE_TOKEN
      })
      return true
    } catch {
      return false
    }
  }

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
      // 1. Save individual upload for audit purposes
      const uploadPath = this.getBlobPath(`uploads/${metadata.uploadedAt}.json`)
      const uploadData = {
        records: newRecords,
        metadata,
        summary
      }
      await this.uploadBlob(uploadPath, uploadData)

      // 2. Retrieve existing master data or create new
      let masterData: MasterData
      const masterPath = this.getBlobPath('master.json')
      
      if (await this.blobExists(masterPath)) {
        const existingMasterUrl = `${this.baseUrl}/api/blob?path=${masterPath}`
        const existing = await this.downloadBlob<MasterData>(existingMasterUrl, false) // Never cache during uploads
        masterData = existing || this.createEmptyMasterData()
      } else {
        masterData = this.createEmptyMasterData()
      }

      // 3. Merge and deduplicate records
      const mergedRecords = this.mergeAndDeduplicateRecords(masterData.records, newRecords)
      
      // 4. Update master data
      const updatedMasterData: MasterData = {
        records: mergedRecords,
        lastUpdated: new Date().toISOString(),
        totalUploads: masterData.totalUploads + 1,
        metadata: [...masterData.metadata, metadata]
      }

      // 5. Save updated master data
      await this.uploadBlob(masterPath, updatedMasterData)

      // 6. Precompute and save aggregations
      console.log(`Computing aggregations for ${mergedRecords.length} total records`)
      const aggregations = this.computeAggregations(mergedRecords)
      console.log('Computed aggregations:', aggregations)
      const aggregationsPath = this.getBlobPath('aggregations.json')
      await this.uploadBlob(aggregationsPath, aggregations)
      console.log('Successfully saved aggregations to blob storage')

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
      // Check cache first
      const cacheKey = this.generateCacheKey(query)
      const cachePath = this.getBlobPath(`cache/${cacheKey}.json`)
      
      if (await this.blobExists(cachePath)) {
        const cacheUrl = `${this.baseUrl}/api/blob?path=${cachePath}`
        const cached = await this.downloadBlob<WatchRecord[]>(cacheUrl, true) // Allow cache for time slice queries
        if (cached) return cached
      }

      // Load master data (never cache time slice queries for fresh data)
      const masterPath = this.getBlobPath('master.json')
      const masterUrl = `${this.baseUrl}/api/blob?path=${masterPath}`
      const masterData = await this.downloadBlob<MasterData>(masterUrl, false)
      
      if (!masterData) return []

      // Filter records based on query
      let filtered = masterData.records

      if (query.startDate || query.endDate) {
        filtered = filtered.filter(record => {
          if (!record.watchedAt) return false
          const watchDate = new Date(record.watchedAt)
          
          if (query.startDate && watchDate < query.startDate) return false
          if (query.endDate && watchDate > query.endDate) return false
          
          return true
        })
      }

      if (query.product) {
        filtered = filtered.filter(record => record.product === query.product)
      }

      if (query.channels && query.channels.length > 0) {
        filtered = filtered.filter(record => 
          record.channelTitle && query.channels!.includes(record.channelTitle)
        )
      }

      if (query.topics && query.topics.length > 0) {
        filtered = filtered.filter(record =>
          record.topics.some(topic => query.topics!.includes(topic))
        )
      }

      // Cache substantial queries (>100 records or date-based)
      if (filtered.length > 100 || query.startDate || query.endDate) {
        await this.uploadBlob(cachePath, filtered).catch(console.warn)
      }

      return filtered.sort((a, b) => {
        if (!a.watchedAt) return 1
        if (!b.watchedAt) return -1
        return new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime()
      })

    } catch (error) {
      console.error('Failed to query time slice:', error)
      return []
    }
  }

  /**
   * Get precomputed aggregations for fast dashboard loading
   */
  async getPrecomputedAggregations(useCache: boolean = false): Promise<PrecomputedAggregations | null> {
    try {
      const aggregationsPath = this.getBlobPath('aggregations.json')
      const aggregationsUrl = `${this.baseUrl}/api/blob?path=${aggregationsPath}`
      return await this.downloadBlob<PrecomputedAggregations>(aggregationsUrl, useCache)
    } catch (error) {
      console.error('Failed to get precomputed aggregations:', error)
      return null
    }
  }

  /**
   * Get upload history and metadata
   */
  async getUploadHistory(useCache: boolean = true): Promise<HistoricalUploadMetadata[]> {
    try {
      const masterPath = this.getBlobPath('master.json')
      const masterUrl = `${this.baseUrl}/api/blob?path=${masterPath}`
      const masterData = await this.downloadBlob<MasterData>(masterUrl, useCache)
      return masterData?.metadata || []
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
      // Clear any cached aggregations
      const aggregationsPath = this.getBlobPath('aggregations.json')
      const aggregationsUrl = `${this.baseUrl}/api/blob?path=${aggregationsPath}`
      
      // Force refresh by making a no-cache request
      await fetch(aggregationsUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      })
      
      console.log('✅ Client caches invalidated for user:', this.userId)
    } catch (error) {
      console.warn('⚠️ Failed to invalidate client caches:', error)
    }
  }

  /**
   * Force refresh of a specific blob by cache busting
   */
  async refreshBlob(fileName: string): Promise<void> {
    try {
      const blobPath = this.getBlobPath(fileName)
      const blobUrl = `${this.baseUrl}/api/blob?path=${blobPath}&t=${Date.now()}`
      
      await fetch(blobUrl, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      })
      
      console.log(`✅ Refreshed blob: ${fileName}`)
    } catch (error) {
      console.warn(`⚠️ Failed to refresh blob ${fileName}:`, error)
    }
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