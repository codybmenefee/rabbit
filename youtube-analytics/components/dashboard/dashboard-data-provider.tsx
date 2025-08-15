'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { WatchRecord } from '@/types/records'
import { watchHistoryStorage } from '@/lib/storage'
import { createHistoricalStorage } from '@/lib/historical-storage'
import { migrateSessionToHistorical, needsSessionMigration } from '@/lib/session-migration'
import { MainDashboard } from './main-dashboard'
import { Loader2, AlertCircle, Database, Cloud, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface DashboardDataProviderProps {
  className?: string
}

type LoadingState = 'loading' | 'success' | 'error' | 'empty' | 'migrating'

export function DashboardDataProvider({ className }: DashboardDataProviderProps) {
  const { data: session, status } = useSession()
  const [data, setData] = useState<WatchRecord[]>([])
  const [loadingState, setLoadingState] = useState<LoadingState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'session' | 'historical' | null>(null)
  const [migrationAttempted, setMigrationAttempted] = useState(false)

  const isAuthenticated = status === 'authenticated' && session?.user?.id

  const loadData = useCallback(async () => {
    setLoadingState('loading')
    setError(null)

    try {
      let records: WatchRecord[] = []
      
      if (isAuthenticated && session?.user?.id) {
        // Check if we need to migrate session data first
        if (!migrationAttempted) {
          const needsMigration = await needsSessionMigration()
          
          if (needsMigration) {
            console.log('Session migration needed for user:', session.user.id)
            setLoadingState('migrating')
            
            try {
              const migrationResult = await migrateSessionToHistorical(session.user.id)
              
              if (migrationResult.success && migrationResult.migratedRecords > 0) {
                console.log(`Successfully migrated ${migrationResult.migratedRecords} records`)
              } else if (!migrationResult.success) {
                console.warn('Migration failed:', migrationResult.error)
              }
            } catch (migrationError) {
              console.warn('Migration failed with error:', migrationError)
            }
          }
          
          setMigrationAttempted(true)
        }

        // Try to load from historical storage first
        console.log('Loading from historical storage for user:', session.user.id)
        const historicalStorage = createHistoricalStorage(session.user.id)
        
        try {
          // Check if we have any historical data
          const aggregations = await historicalStorage.getPrecomputedAggregations()
          
          if (aggregations && aggregations.totalRecords > 0) {
            // Load all historical data for dashboard
            records = await historicalStorage.queryTimeSlice({})
            setDataSource('historical')
            console.log(`Loaded ${records.length} records from historical storage`)
          } else {
            // No historical data, try session storage
            const sessionData = await watchHistoryStorage.getRecords()
            records = sessionData || []
            setDataSource('session')
            console.log(`No historical data found, loaded ${records.length} records from session storage`)
          }
        } catch (histError) {
          console.warn('Failed to load from historical storage, falling back to session:', histError)
          const sessionData = await watchHistoryStorage.getRecords()
          records = sessionData || []
          setDataSource('session')
        }
      } else {
        // Load from session storage for unauthenticated users
        console.log('Loading from session storage (unauthenticated)')
        const sessionData = await watchHistoryStorage.getRecords()
        records = sessionData || []
        setDataSource('session')
      }

      setData(records)
      setLoadingState(records.length > 0 ? 'success' : 'empty')

    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
      setLoadingState('error')
    }
  }, [isAuthenticated, session?.user?.id, migrationAttempted])

  // Load data when authentication status changes
  useEffect(() => {
    if (status !== 'loading') {
      loadData()
    }
  }, [status, loadData])

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
                  {isAuthenticated ? 'Connecting to historical storage...' : 'Loading session data...'}
                </p>
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

  if (loadingState !== 'success') {
    return (
      <div className={className}>
        {renderLoadingState()}
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Data source indicator */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-terminal-muted terminal-text">
          {dataSource === 'historical' ? (
            <>
              <Cloud className="h-4 w-4 signal-blue" />
              <span>Historical Storage</span>
              <span className="text-terminal-muted">• {data.length.toLocaleString()} total records</span>
            </>
          ) : (
            <>
              <Database className="h-4 w-4 signal-orange" />
              <span>Session Storage</span>
              <span className="text-terminal-muted">• {data.length.toLocaleString()} records</span>
              {isAuthenticated && (
                <span className="signal-green">• Sign in benefits available</span>
              )}
            </>
          )}
        </div>
        
        <button
          onClick={loadData}
          className="text-xs text-terminal-muted hover:text-terminal-text terminal-text flex items-center space-x-1"
        >
          <span>REFRESH</span>
        </button>
      </div>

      <MainDashboard data={data} />
    </div>
  )
}