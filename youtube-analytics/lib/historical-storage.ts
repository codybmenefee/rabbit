import { put, head } from '@vercel/blob'
import { WatchRecord, ImportSummary } from '@/types/records'

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

  constructor(userId: string) {
    this.userId = userId
    
    // Dynamically determine base URL
    if (typeof window !== 'undefined') {
      // Client-side: use current origin
      this.baseUrl = window.location.origin
    } else {
      // Server-side: use environment variables or defaults
      this.baseUrl = process.env.NEXTAUTH_URL || 
                     process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
                     'http://localhost:3000'
    }
  }

  private getBlobPath(fileName: string): string {
    return `users/${this.userId}/${fileName}`
  }

  private async uploadBlob(path: string, data: any): Promise<string> {
    const compressed = JSON.stringify(data)
    const blob = await put(path, compressed, {
      access: 'private',
      contentType: 'application/json'
    })
    return blob.url
  }

  private async downloadBlob<T>(url: string): Promise<T | null> {
    try {
      const response = await fetch(url)
      if (!response.ok) return null
      const data = await response.text()
      return JSON.parse(data) as T
    } catch (error) {
      console.warn('Failed to download blob:', error)
      return null
    }
  }

  private async blobExists(path: string): Promise<boolean> {
    try {
      await head(path)
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
        const existing = await this.downloadBlob<MasterData>(existingMasterUrl)
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
      const aggregations = this.computeAggregations(mergedRecords)
      const aggregationsPath = this.getBlobPath('aggregations.json')
      await this.uploadBlob(aggregationsPath, aggregations)

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
        const cached = await this.downloadBlob<WatchRecord[]>(cacheUrl)
        if (cached) return cached
      }

      // Load master data
      const masterPath = this.getBlobPath('master.json')
      const masterUrl = `${this.baseUrl}/api/blob?path=${masterPath}`
      const masterData = await this.downloadBlob<MasterData>(masterUrl)
      
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
  async getPrecomputedAggregations(): Promise<PrecomputedAggregations | null> {
    try {
      const aggregationsPath = this.getBlobPath('aggregations.json')
      const aggregationsUrl = `${this.baseUrl}/api/blob?path=${aggregationsPath}`
      return await this.downloadBlob<PrecomputedAggregations>(aggregationsUrl)
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
      const masterPath = this.getBlobPath('master.json')
      const masterUrl = `${this.baseUrl}/api/blob?path=${masterPath}`
      const masterData = await this.downloadBlob<MasterData>(masterUrl)
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
}

/**
 * Factory function to create HistoricalStorage instance for authenticated user
 */
export function createHistoricalStorage(userId: string): HistoricalStorage {
  return new HistoricalStorage(userId)
}