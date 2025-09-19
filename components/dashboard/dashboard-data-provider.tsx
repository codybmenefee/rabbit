'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { WatchRecord } from '@/types/records'
import { MainDashboard } from './main-dashboard'
import { Loader2, Cloud, RefreshCw, Shield } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { normalizeWatchRecord } from '@/lib/aggregations'

interface DashboardDataProviderProps {
  className?: string
  onRequestImport?: () => void
}
type LoadingState = 'loading' | 'success' | 'error' | 'empty'

export function DashboardDataProvider({ className, onRequestImport }: DashboardDataProviderProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const [loadingState, setLoadingState] = useState<LoadingState>('loading')
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())
  const [validationStatus, setValidationStatus] = useState<'unknown' | 'healthy' | 'warning' | 'error'>('unknown')

  const convexRecords = useQuery(api.dashboard.records, isSignedIn ? {} : 'skip' as any)
  const data: WatchRecord[] = useMemo(() => {
    if (!Array.isArray(convexRecords)) {
      return []
    }

    return (convexRecords as any[]).map(raw => {
      const normalized = normalizeWatchRecord({
        ...raw,
        startedAt: raw.startedAt
      }, raw.id)
      return {
        ...normalized,
        topics: Array.isArray(raw.topics) && raw.topics.length > 0 ? raw.topics : normalized.topics,
        product: raw.product === 'YouTube Music' ? 'YouTube Music' : normalized.product
      }
    })
  }, [convexRecords])

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
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="space-y-2 text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-400" />
              <p className="text-sm text-slate-400">Fetching your data from Convex...</p>
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
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 text-sm">
        <div className="flex flex-wrap items-center gap-2 text-slate-400">
          <Cloud className="h-4 w-4 text-cyan-400" />
          <span>Convex data</span>
          <span className="text-slate-500">• {data.length.toLocaleString()} records</span>
          {validationStatus !== 'unknown' && (
            <>
              <span className="text-slate-600">•</span>
              <div className="flex items-center gap-1">
                <Shield className={`h-3 w-3 ${
                  validationStatus === 'healthy'
                    ? 'text-emerald-400'
                    : validationStatus === 'warning'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                }`} />
                <span className={`text-xs font-medium ${
                  validationStatus === 'healthy'
                    ? 'text-emerald-300'
                    : validationStatus === 'warning'
                      ? 'text-amber-300'
                      : 'text-rose-300'
                }`}>
                  {validationStatus.toUpperCase()}
                </span>
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>Last updated: {lastRefreshed.toLocaleTimeString()}</span>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      <MainDashboard data={data} onRequestImport={onRequestImport} />
    </div>
  )
}
