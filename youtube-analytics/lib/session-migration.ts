/**
 * Session Migration Service
 * Handles transferring session storage data to historical storage when users log in
 */

import { watchHistoryStorage } from './storage'
import { createHistoricalStorage, HistoricalUploadMetadata } from './historical-storage'
import { WatchRecord } from '@/types/records'

export interface MigrationResult {
  success: boolean
  migratedRecords: number
  error?: string
  hadSessionData: boolean
}

/**
 * Migrate session data to historical storage for authenticated user
 */
export async function migrateSessionToHistorical(userId: string): Promise<MigrationResult> {
  try {
    console.log('Starting session migration for user:', userId)

    // Check if there's any session data to migrate
    const hasSessionData = await watchHistoryStorage.hasData()
    
    if (!hasSessionData) {
      console.log('No session data found to migrate')
      return {
        success: true,
        migratedRecords: 0,
        hadSessionData: false
      }
    }

    // Get session data
    const sessionRecords = await watchHistoryStorage.getRecords()
    if (!sessionRecords || sessionRecords.length === 0) {
      console.log('Session storage was empty')
      return {
        success: true,
        migratedRecords: 0,
        hadSessionData: false
      }
    }

    console.log(`Found ${sessionRecords.length} records in session storage`)

    // Create historical storage instance
    const historicalStorage = createHistoricalStorage(userId)

    // Check if historical storage already has data
    const existingAggregations = await historicalStorage.getPrecomputedAggregations()
    const hasHistoricalData = existingAggregations && existingAggregations.totalRecords > 0

    if (hasHistoricalData) {
      console.log(`User already has ${existingAggregations?.totalRecords} records in historical storage`)
      
      // Get existing records to check for duplicates
      const existingRecords = await historicalStorage.queryTimeSlice({})
      const existingIds = new Set(existingRecords.map(r => r.id))
      
      // Filter out records that already exist in historical storage
      const newRecords = sessionRecords.filter(r => !existingIds.has(r.id))
      
      if (newRecords.length === 0) {
        console.log('All session records already exist in historical storage')
        
        // Clear session storage since data is already preserved
        await watchHistoryStorage.clearAll()
        
        return {
          success: true,
          migratedRecords: 0,
          hadSessionData: true
        }
      }
      
      console.log(`Found ${newRecords.length} new records to migrate`)
      sessionRecords.splice(0, sessionRecords.length, ...newRecords)
    }

    // Create migration metadata
    const migrationMetadata: HistoricalUploadMetadata = {
      uploadedAt: new Date().toISOString(),
      fileName: 'session-migration.json',
      fileSize: JSON.stringify(sessionRecords).length,
      recordCount: sessionRecords.length
    }

    // Generate summary for the session records
    const { generateSummary } = await import('./parser-core')
    const core = new (await import('./parser-core')).YouTubeHistoryParserCore()
    const summary = core.generateSummary(sessionRecords)

    // Save to historical storage
    await historicalStorage.saveUpload(sessionRecords, migrationMetadata, summary)
    
    console.log(`Successfully migrated ${sessionRecords.length} records to historical storage`)

    // Clear session storage after successful migration
    await watchHistoryStorage.clearAll()
    console.log('Cleared session storage after successful migration')

    return {
      success: true,
      migratedRecords: sessionRecords.length,
      hadSessionData: true
    }

  } catch (error) {
    console.error('Session migration failed:', error)
    return {
      success: false,
      migratedRecords: 0,
      error: error instanceof Error ? error.message : 'Unknown migration error',
      hadSessionData: true
    }
  }
}

/**
 * Check if session migration is needed for a user
 */
export async function needsSessionMigration(): Promise<boolean> {
  try {
    return await watchHistoryStorage.hasData()
  } catch (error) {
    console.warn('Failed to check session migration status:', error)
    return false
  }
}

/**
 * React hook for automatic session migration
 */
export function useSessionMigration() {
  const migrationAttempted = new Set<string>()

  const triggerMigration = async (userId: string | null | undefined): Promise<MigrationResult | null> => {
    if (!userId || migrationAttempted.has(userId)) {
      return null
    }

    migrationAttempted.add(userId)
    
    try {
      const needsMigration = await needsSessionMigration()
      if (!needsMigration) {
        return null
      }

      console.log('Triggering automatic session migration for user:', userId)
      return await migrateSessionToHistorical(userId)
    } catch (error) {
      console.error('Auto migration failed:', error)
      return {
        success: false,
        migratedRecords: 0,
        error: error instanceof Error ? error.message : 'Auto migration failed',
        hadSessionData: true
      }
    }
  }

  return { triggerMigration }
}