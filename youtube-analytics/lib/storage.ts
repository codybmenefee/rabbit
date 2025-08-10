import { get, set, del, keys } from 'idb-keyval'
import { WatchRecord, StorageMetadata, ImportSummary } from '@/types/records'

const STORAGE_KEYS = {
  RECORDS: 'youtube-analytics:records',
  METADATA: 'youtube-analytics:metadata',
  SUMMARY: 'youtube-analytics:summary'
} as const

export class WatchHistoryStorage {
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
}

export const watchHistoryStorage = new WatchHistoryStorage()