'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { WatchRecord } from '@/types/records'
import { MainDashboard } from './main-dashboard'
import { Loader2, Cloud, RefreshCw, Shield } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface DashboardDataProviderProps { className?: string }
type LoadingState = 'loading' | 'success' | 'error' | 'empty'

export function DashboardDataProvider({ className }: DashboardDataProviderProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const [loadingState, setLoadingState] = useState<LoadingState>('loading')
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [validationStatus, setValidationStatus] = useState<'unknown' | 'healthy' | 'warning' | 'error'>('unknown')

  const convexRecords = useQuery(api.dashboard.records, isSignedIn ? { days: 365 } : 'skip' as any)
  const data: WatchRecord[] = useMemo(() => Array.isArray(convexRecords) ? convexRecords as WatchRecord[] : [], [convexRecords])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      setLoadingState('empty')
      return
    }
    if (convexRecords === undefined) {
      setLoadingState('loading')
    } else if (Array.isArray(convexRecords)) {
      setLoadingState(convexRecords.length > 0 ? 'success' : 'empty')
      setLastRefreshed(new Date())
      try {
        // Simple quality gauge based on presence of timestamps
        const withTs = (convexRecords as WatchRecord[]).filter(r => r.watchedAt !== null).length
        const ratio = convexRecords.length ? withTs / convexRecords.length : 0
        setValidationStatus(ratio >= 0.9 ? 'healthy' : ratio >= 0.7 ? 'warning' : 'error')
      } catch {}
    } else {
      setLoadingState('error')
    }
  }, [isLoaded, isSignedIn, convexRecords])

  const renderLoadingState = () => {
    switch (loadingState) {
      case 'loading':
        return (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin signal-green mx-auto" />
              <div className="space-y-2">
                <p className="text-lg font-medium terminal-text">LOADING_DATA_STREAM...</p>
                <p className="text-terminal-muted text-sm terminal-text">Fetching your data from Convex...</p>
              </div>
            </div>
          </div>
        )

      // No migrating/conflict states in Convex-only mode

      case 'error':
        return null

      case 'empty':
        return null

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
      {/* Enhanced data source indicator */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-sm text-terminal-muted terminal-text">
          <Cloud className="h-4 w-4 signal-blue" />
          <span>Convex</span>
          <span className="text-terminal-muted">• {data.length.toLocaleString()} total records</span>
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
            onClick={() => window.location.reload()}
            className="text-xs text-terminal-muted hover:text-terminal-text terminal-text flex items-center space-x-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>REFRESH</span>
          </button>
          
          {/* Validation toggle removed in Convex-only mode */}
        </div>
      </div>

      <MainDashboard data={data} />
    </div>
  )
}
