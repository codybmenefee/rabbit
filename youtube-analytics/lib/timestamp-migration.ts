import { WatchRecord } from '@/types/records'
import { extractTimestamp } from './resilient-timestamp-extractor'

/**
 * Timestamp Migration Utility
 * 
 * Fixes existing stored records that have null watchedAt due to old parser
 * by re-parsing the rawTimestamp field with the new resilient extractor.
 */

export interface MigrationResult {
  totalRecords: number
  recordsWithRawTimestamp: number
  successfullyMigrated: number
  failed: number
  alreadyHadTimestamp: number
}

/**
 * Migrate a single record by re-parsing its rawTimestamp
 */
export function migrateRecordTimestamp(record: WatchRecord): WatchRecord {
  // If already has a valid timestamp, no migration needed
  if (record.watchedAt) {
    return record
  }
  
  // If no raw timestamp to work with, return as-is
  if (!record.rawTimestamp) {
    return record
  }
  
  try {
    // Use the fixed timestamp extractor
    const result = extractTimestamp(record.rawTimestamp, record.rawTimestamp)
    
    if (result.timestamp) {
      // Successfully extracted timestamp - update derived fields
      const date = new Date(result.timestamp)
      
      return {
        ...record,
        watchedAt: result.timestamp,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        week: getWeekNumber(date),
        dayOfWeek: date.getDay(),
        hour: date.getHours(),
        yoyKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      }
    }
  } catch (error) {
    console.warn('Failed to migrate timestamp for record:', record.id, error)
  }
  
  // Migration failed, return original record
  return record
}

/**
 * Migrate an array of records
 */
export function migrateRecordsTimestamps(records: WatchRecord[]): {
  migratedRecords: WatchRecord[]
  result: MigrationResult
} {
  const result: MigrationResult = {
    totalRecords: records.length,
    recordsWithRawTimestamp: 0,
    successfullyMigrated: 0,
    failed: 0,
    alreadyHadTimestamp: 0
  }
  
  const migratedRecords = records.map(record => {
    // Count records with existing timestamps
    if (record.watchedAt) {
      result.alreadyHadTimestamp++
      return record
    }
    
    // Count records with raw timestamp data
    if (record.rawTimestamp) {
      result.recordsWithRawTimestamp++
      
      const migrated = migrateRecordTimestamp(record)
      
      if (migrated.watchedAt && migrated.watchedAt !== record.watchedAt) {
        result.successfullyMigrated++
      } else {
        result.failed++
      }
      
      return migrated
    }
    
    // No raw timestamp available
    return record
  })
  
  return { migratedRecords, result }
}

/**
 * Get ISO week number for a date
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Check if records need migration (have null timestamps but raw data)
 */
export function needsTimestampMigration(records: WatchRecord[]): boolean {
  return records.some(record => 
    !record.watchedAt && record.rawTimestamp
  )
}

/**
 * Get migration statistics without performing migration
 */
export function analyzeMigrationNeeds(records: WatchRecord[]): MigrationResult {
  const result: MigrationResult = {
    totalRecords: records.length,
    recordsWithRawTimestamp: 0,
    successfullyMigrated: 0,
    failed: 0,
    alreadyHadTimestamp: 0
  }
  
  records.forEach(record => {
    if (record.watchedAt) {
      result.alreadyHadTimestamp++
    } else if (record.rawTimestamp) {
      result.recordsWithRawTimestamp++
    }
  })
  
  return result
}