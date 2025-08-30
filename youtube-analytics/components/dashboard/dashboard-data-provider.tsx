'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { WatchRecord } from '@/types/records'
import { watchHistoryStorage } from '@/lib/storage'
import { createHistoricalStorage } from '@/lib/historical-storage'
import { migrateSessionToHistorical, needsSessionMigration } from '@/lib/session-migration'
import { MainDashboard } from './main-dashboard'
import { StorageConflictModal, ConflictResolutionAction } from '@/components/storage/storage-conflict-modal'
import { StorageStatus } from '@/components/storage/storage-status'
import { ValidationDashboard } from '@/components/validation/validation-dashboard'
import { dataConsistencyValidator } from '@/lib/data-consistency-validator'
import { DataConsistencyReport, ValidationStatus } from '@/types/validation'
import { Loader2, AlertCircle, Database, Cloud, ArrowRight, RefreshCw, Shield } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface DashboardDataProviderProps {
  className?: string
}

type LoadingState = 'loading' | 'success' | 'error' | 'empty' | 'migrating' | 'conflict'
type DataSource = 'session' | 'historical' | 'both'

interface DataSourceInfo {
  source: DataSource
  recordCount: number
  lastUpdated?: string
  hasConflict: boolean
  conflictDetails?: {
    sessionCount: number
    historicalCount: number
    sessionData?: WatchRecord[]
    historicalData?: WatchRecord[]
  }
}

export function DashboardDataProvider({ className }: DashboardDataProviderProps) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<WatchRecord[]>([])
  const [loadingState, setLoadingState] = useState<LoadingState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [dataSourceInfo, setDataSourceInfo] = useState<DataSourceInfo | null>(null)
  const [migrationAttempted, setMigrationAttempted] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [conflictData, setConflictData] = useState<{ sessionData: WatchRecord[], historicalData: WatchRecord[] } | null>(null)
  const [validationReport, setValidationReport] = useState<DataConsistencyReport | null>(null)
  const [showValidationDashboard, setShowValidationDashboard] = useState(false)
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('unknown')

  const isAuthenticated = !!userId

  const loadDataFromSources = useCallback(async (): Promise<{
    sessionData: WatchRecord[]
    historicalData: WatchRecord[]
    sessionError?: string
    historicalError?: string
  }> => {
    const result = {
      sessionData: [] as WatchRecord[],
      historicalData: [] as WatchRecord[]
    }

    // Always try to load from session storage
    try {
      result.sessionData = await watchHistoryStorage.getRecords() || []
      console.log(`📦 Session storage: ${result.sessionData.length} records`)
    } catch (error) {
      console.warn('❌ Failed to load from session storage:', error)
      result.sessionError = error instanceof Error ? error.message : 'Session storage failed'
    }

    // Try historical storage if authenticated
    if (isAuthenticated && userId) {
      try {
        const historicalStorage = createHistoricalStorage(userId)
        const aggregations = await historicalStorage.getPrecomputedAggregations()
        
        if (aggregations && aggregations.totalRecords > 0) {
          result.historicalData = await historicalStorage.queryTimeSlice({})
          console.log(`☁️ Historical storage: ${result.historicalData.length} records`)
        } else {
          console.log('☁️ Historical storage: No aggregations found')
        }
      } catch (error) {
        console.warn('❌ Failed to load from historical storage:', error)
        result.historicalError = error instanceof Error ? error.message : 'Historical storage failed'
      }
    }

    return result
  }, [isAuthenticated, userId])

  const detectDataConflict = useCallback((sessionData: WatchRecord[], historicalData: WatchRecord[]): boolean => {
    if (sessionData.length === 0 || historicalData.length === 0) return false
    
    // Consider it a conflict if session has significantly more data than historical
    // This could indicate failed migration or new data not yet synced
    const significantDifference = Math.abs(sessionData.length - historicalData.length) > 10
    const sessionHasMoreData = sessionData.length > historicalData.length
    
    return significantDifference && sessionHasMoreData
  }, [])

  const loadData = useCallback(async () => {
    console.log('🔄 Starting unified data loading...')
    setLoadingState('loading')
    setError(null)
    setRetryCount(prev => prev + 1)

    try {
      // Handle migration first if needed
      if (isAuthenticated && userId && !migrationAttempted) {
        const needsMigration = await needsSessionMigration()
        
        if (needsMigration) {
          console.log('🔄 Migration needed for user:', userId)
          setLoadingState('migrating')
          
          try {
            const migrationResult = await migrateSessionToHistorical(userId)
            
            if (migrationResult.success && migrationResult.migratedRecords > 0) {
              console.log(`✅ Successfully migrated ${migrationResult.migratedRecords} records`)
              
              // Invalidate caches after successful migration
              const historicalStorage = createHistoricalStorage(userId)
              await historicalStorage.invalidateClientCaches()
              
              // Force router refresh to clear any stale cache
              router.refresh()
            } else if (!migrationResult.success) {
              console.warn('⚠️ Migration failed:', migrationResult.error)
            }
          } catch (migrationError) {
            console.warn('❌ Migration failed with error:', migrationError)
          }
        }
        
        setMigrationAttempted(true)
      }

      // Load from both sources
      const { sessionData, historicalData, sessionError, historicalError } = await loadDataFromSources()
      
      // Determine data source and detect conflicts
      const hasConflict = detectDataConflict(sessionData, historicalData)
      let finalData: WatchRecord[] = []
      let sourceInfo: DataSourceInfo

      if (hasConflict) {
        console.log('⚠️ Data conflict detected between storage systems')
        setLoadingState('conflict')
        setConflictData({ sessionData, historicalData })
        sourceInfo = {
          source: 'both',
          recordCount: Math.max(sessionData.length, historicalData.length),
          hasConflict: true,
          conflictDetails: {
            sessionCount: sessionData.length,
            historicalCount: historicalData.length,
            sessionData,
            historicalData
          }
        }
        // Use the larger dataset for now, but show conflict UI
        finalData = sessionData.length > historicalData.length ? sessionData : historicalData
      } else if (historicalData.length > 0) {
        // Prefer historical storage if available
        console.log('✅ Using historical storage data')
        finalData = historicalData
        sourceInfo = {
          source: 'historical',
          recordCount: historicalData.length,
          hasConflict: false
        }
      } else if (sessionData.length > 0) {
        // Fall back to session storage
        console.log('✅ Using session storage data')
        finalData = sessionData
        sourceInfo = {
          source: 'session',
          recordCount: sessionData.length,
          hasConflict: false
        }
      } else {
        // No data in either source
        console.log('📭 No data found in any storage')
        finalData = []
        sourceInfo = {
          source: 'session',
          recordCount: 0,
          hasConflict: false
        }
      }

      // Handle errors
      if (sessionError && historicalError) {
        throw new Error(`Both storage systems failed: Session: ${sessionError}, Historical: ${historicalError}`)
      } else if (sessionError && historicalData.length === 0) {
        throw new Error(`Session storage failed and no historical data: ${sessionError}`)
      } else if (historicalError && sessionData.length === 0) {
        console.warn('Historical storage failed but using session data:', historicalError)
      }

      setData(finalData)
      setDataSourceInfo(sourceInfo)
      setLoadingState(hasConflict ? 'conflict' : (finalData.length > 0 ? 'success' : 'empty'))
      setLastRefreshed(new Date())
      console.log(`✅ Data loading complete: ${finalData.length} records from ${sourceInfo.source}`)

      // Run automatic validation if we have data from both sources
      if (isAuthenticated && sessionData.length > 0 && historicalData.length > 0 && !hasConflict) {
        try {
          console.log('🔍 Running automatic validation after data load...')
          const report = await dataConsistencyValidator.validateConsistency(
            sessionData,
            historicalData,
            {
              recordCountTolerance: 5,
              checksumValidation: true,
              deduplicationCheck: true,
              automaticValidation: {
                enabled: true,
                frequency: 30,
                triggerOnDataChange: true
              }
            }
          )
          
          setValidationReport(report)
          setValidationStatus(report.overallStatus)
          
          // Show validation dashboard if there are issues
          if (report.overallStatus === 'error' || report.issues.length > 2) {
            setShowValidationDashboard(true)
          }
          
          console.log(`🔍 Automatic validation completed: ${report.overallStatus} (${report.issues.length} issues)`)
        } catch (validationError) {
          console.warn('⚠️ Automatic validation failed:', validationError)
          setValidationStatus('error')
        }
      } else if (finalData.length > 0) {
        // Run single-source validation for data quality check
        try {
          const qualityMetrics = dataConsistencyValidator.validateDataQuality(finalData)
          setValidationStatus(qualityMetrics.overallQualityScore >= 90 ? 'healthy' : 
            qualityMetrics.overallQualityScore >= 70 ? 'warning' : 'error')
        } catch (error) {
          console.warn('⚠️ Data quality validation failed:', error)
        }
      }

    } catch (err) {
      console.error('❌ Failed to load dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setLoadingState('error')
    }
  }, [isAuthenticated, userId, migrationAttempted, loadDataFromSources, detectDataConflict])

  const handleConflictResolution = useCallback(async (action: ConflictResolutionAction, resolvedData?: WatchRecord[]) => {
    try {
      if (resolvedData) {
        setData(resolvedData)
        setDataSourceInfo(prev => prev ? {
          ...prev,
          hasConflict: false,
          conflictDetails: undefined,
          recordCount: resolvedData.length
        } : null)
        setLoadingState('success')
      }
      
      // Force reload data to ensure consistency
      setTimeout(() => {
        loadData()
      }, 1000)
    } catch (error) {
      console.error('Failed to handle conflict resolution:', error)
      setError('Failed to resolve storage conflict')
      setLoadingState('error')
    }
  }, [loadData])

  const handleValidationComplete = useCallback((report: DataConsistencyReport) => {
    setValidationReport(report)
    setValidationStatus(report.overallStatus)
    
    // Update data source info if validation reveals conflicts
    if (report.overallStatus === 'error' && report.issues.some(issue => issue.category === 'recordCount')) {
      setDataSourceInfo(prev => prev ? { ...prev, hasConflict: true } : null)
    }
  }, [])

  // Load data when authentication status changes
  useEffect(() => {
    if (isLoaded) {
      loadData()
    }
  }, [isLoaded, loadData])

  const renderLoadingState = () => {
    switch (loadingState) {
      case 'loading':
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin signal-green mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-medium terminal-text">LOADING_DATA_STREAM...</p>
                <p className="text-terminal-muted text-sm terminal-text">
                  {isAuthenticated ? 'Checking storage systems...' : 'Loading session data...'}
                </p>
                {retryCount > 1 && (
                  <p className="text-xs text-orange-400">Retry attempt {retryCount}</p>
                )}
              </div>
            </div>
          </div>
        )

      case 'migrating':
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Database className="h-6 w-6 signal-orange" />
                <ArrowRight className="h-6 w-6 animate-pulse signal-blue" />
                <Cloud className="h-6 w-6 signal-blue" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium terminal-text">MIGRATING_SESSION_DATA...</p>
                <p className="text-terminal-muted text-sm terminal-text">
                  Transferring your data to permanent historical storage...
                </p>
              </div>
            </div>
          </div>
        )

      case 'conflict':
        return (
          <Card className="p-8 text-center border-yellow-500/20 bg-yellow-500/5">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-yellow-500 mb-2 terminal-text">STORAGE_CONFLICT_DETECTED</h3>
            <p className="text-terminal-muted mb-4 terminal-text">
              Data mismatch between storage systems detected.
            </p>
            {dataSourceInfo?.conflictDetails && (
              <div className="text-sm text-terminal-muted mb-4 space-y-1">
                <p>Session Storage: {dataSourceInfo.conflictDetails.sessionCount} records</p>
                <p>Historical Storage: {dataSourceInfo.conflictDetails.historicalCount} records</p>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setShowConflictModal(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 terminal-text flex items-center gap-2"
              >
                <AlertCircle className="h-4 w-4" />
                RESOLVE_CONFLICT
              </button>
              <button
                onClick={loadData}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 terminal-text flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                RETRY_SYNC
              </button>
            </div>
          </Card>
        )

      case 'error':
        return (
          <Card className="p-8 text-center border-signal-red-500/20 bg-signal-red-500/5">
            <AlertCircle className="h-12 w-12 signal-red mx-auto mb-4" />
            <h3 className="text-lg font-medium signal-red mb-2 terminal-text">DATA_STREAM_ERROR</h3>
            <p className="text-terminal-muted mb-4 terminal-text">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-signal-red-600 text-white rounded hover:bg-signal-red-700 terminal-text"
            >
              RETRY_OPERATION
            </button>
          </Card>
        )

      case 'empty':
        return (
          <Card className="p-8 text-center border-signal-orange-500/20 bg-signal-orange-500/5">
            <Database className="h-12 w-12 signal-orange mx-auto mb-4" />
            <h3 className="text-lg font-medium signal-orange mb-2 terminal-text">NO_DATA_AVAILABLE</h3>
            <p className="text-terminal-muted mb-4 terminal-text">
              No watch history data found. Upload your Google Takeout file to begin analysis.
            </p>
            <div className="text-sm text-terminal-muted terminal-text">
              <p>1. Visit <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" className="signal-orange hover:underline">Google Takeout</a></p>
              <p>2. Select YouTube and YouTube Music</p>
              <p>3. Download and upload watch-history.html</p>
            </div>
          </Card>
        )

      default:
        return null
    }
  }

  if (loadingState !== 'success' && loadingState !== 'conflict') {
    return (
      <div className={className}>
        {renderLoadingState()}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Enhanced data source indicator */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-terminal-muted terminal-text">
          {dataSourceInfo?.source === 'historical' ? (
            <>
              <Cloud className="h-4 w-4 signal-blue" />
              <span>Historical Storage</span>
              <span className="text-terminal-muted">• {dataSourceInfo.recordCount.toLocaleString()} total records</span>
            </>
          ) : dataSourceInfo?.source === 'both' ? (
            <>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-yellow-500">Conflict Mode</span>
              <span className="text-terminal-muted">• {dataSourceInfo.recordCount.toLocaleString()} records (largest set)</span>
            </>
          ) : (
            <>
              <Database className="h-4 w-4 signal-orange" />
              <span>Session Storage</span>
              <span className="text-terminal-muted">• {dataSourceInfo?.recordCount.toLocaleString() || 0} records</span>
              {isAuthenticated && (
                <span className="signal-green">• Historical storage available</span>
              )}
            </>
          )}
          {dataSourceInfo?.hasConflict && (
            <span className="text-yellow-500">• Storage conflict detected</span>
          )}
          {validationStatus !== 'unknown' && (
            <>
              <span className="text-gray-400">•</span>
              <div className="flex items-center space-x-1">
                <Shield className={`h-3 w-3 ${
                  validationStatus === 'healthy' ? 'text-green-500' : 
                  validationStatus === 'warning' ? 'text-yellow-500' : 'text-red-500'
                }`} />
                <span className={`text-xs ${
                  validationStatus === 'healthy' ? 'text-green-500' : 
                  validationStatus === 'warning' ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  {validationStatus.toUpperCase()}
                </span>
              </div>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-xs text-gray-500">
            Last updated: {lastRefreshed.toLocaleTimeString()}
          </span>
          <button
            onClick={async () => {
              // Invalidate caches before refresh if authenticated
              if (isAuthenticated && userId) {
                const historicalStorage = createHistoricalStorage(userId)
                await historicalStorage.invalidateClientCaches()
                router.refresh()
              }
              loadData()
            }}
            className="text-xs text-terminal-muted hover:text-terminal-text terminal-text flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>REFRESH</span>
          </button>
          
          {/* Validation Toggle Button */}
          {validationReport && (
            <button
              onClick={() => setShowValidationDashboard(!showValidationDashboard)}
              className={`text-xs flex items-center space-x-1 px-2 py-1 rounded terminal-text ${
                validationStatus === 'healthy' ? 'text-green-600 hover:bg-green-100' :
                validationStatus === 'warning' ? 'text-yellow-600 hover:bg-yellow-100' :
                'text-red-600 hover:bg-red-100'
              }`}
            >
              <Shield className="h-3 w-3" />
              <span>VALIDATION</span>
            </button>
          )}
        </div>
      </div>

      {/* Validation Dashboard */}
      {showValidationDashboard && (
        <div className="mb-6">
          <ValidationDashboard 
            onValidationComplete={handleValidationComplete}
            compact={false}
          />
        </div>
      )}

      <MainDashboard data={data} />
      
      {/* Storage Conflict Resolution Modal */}
      {showConflictModal && dataSourceInfo?.conflictDetails && conflictData && (
        <StorageConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          onResolve={handleConflictResolution}
          conflictDetails={dataSourceInfo.conflictDetails}
        />
      )}
    </div>
  )
}
