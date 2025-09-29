'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { WatchRecord } from '@/lib/types'
import { MainDashboard, generateSampleData } from './main-dashboard'
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
    // If not signed in, use sample data for demonstration
    if (!isSignedIn) {
      return generateSampleData()
    }

    if (!Array.isArray(convexRecords)) {
      return []
    }

    return (convexRecords as any[]).map(raw => {
      try {
        const normalized = normalizeWatchRecord({
          ...raw,
          startedAt: raw.startedAt
        }, raw.id)
        return {
          ...normalized,
          topics: Array.isArray(raw.topics) && raw.topics.length > 0 ? raw.topics : normalized.topics,
          product: raw.product === 'YouTube Music' ? 'YouTube Music' : normalized.product
        }
      } catch (error) {
        console.warn('Failed to normalize record:', raw, error)
        // Return a minimal valid record to prevent crashes
        return {
          id: raw.id || `fallback-${Date.now()}`,
          watchedAt: raw.startedAt || raw.watchedAt || null,
          videoId: raw.videoId || null,
          videoTitle: raw.videoTitle || 'Unknown Video',
          videoUrl: raw.videoUrl || null,
          channelTitle: raw.channelTitle || 'Unknown Channel',
          channelUrl: raw.channelUrl || null,
          product: 'YouTube' as const,
          topics: [],
          year: null,
          month: null,
          week: null,
          dayOfWeek: null,
          hour: null,
          yoyKey: null,
          rawTimestamp: raw.startedAt || raw.watchedAt || null
        }
      }
    })
  }, [convexRecords, isSignedIn])

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) {
      // Use sample data when not signed in
      setLoadingState('success')
      setLastRefreshed(new Date())
      setValidationStatus('healthy')
      return
    }
    if (convexRecords === undefined) {
      setLoadingState('loading')
    } else if (Array.isArray(convexRecords)) {
      setLoadingState(convexRecords.length > 0 ? 'success' : 'empty')
      setLastRefreshed(new Date())
      try {
        // Check data quality based on completeness rather than just timestamps
        const withVideoTitles = (convexRecords as WatchRecord[]).filter(r => r.videoTitle && r.videoTitle !== 'Unknown Video').length
        const withChannels = (convexRecords as WatchRecord[]).filter(r => r.channelTitle && r.channelTitle !== 'Unknown Channel').length
        const withTs = (convexRecords as WatchRecord[]).filter(r => r.watchedAt !== null).length
        
        const titleRatio = convexRecords.length ? withVideoTitles / convexRecords.length : 0
        const channelRatio = convexRecords.length ? withChannels / convexRecords.length : 0
        const tsRatio = convexRecords.length ? withTs / convexRecords.length : 0
        
        // Log validation details for debugging
        console.log(`Data validation: ${withVideoTitles}/${convexRecords.length} have titles (${(titleRatio * 100).toFixed(1)}%), ${withChannels}/${convexRecords.length} have channels (${(channelRatio * 100).toFixed(1)}%), ${withTs}/${convexRecords.length} have timestamps (${(tsRatio * 100).toFixed(1)}%)`)
        
        // Base validation on overall data completeness, not just timestamps
        const overallQuality = (titleRatio + channelRatio + tsRatio * 0.5) / 2.5 // Weight timestamps less heavily
        setValidationStatus(overallQuality >= 0.7 ? 'healthy' : overallQuality >= 0.4 ? 'warning' : 'error')
      } catch (error) {
        console.warn('Data validation error:', error)
        setValidationStatus('warning')
      }
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
          <span>{isSignedIn ? 'Convex data' : 'Sample data'}</span>
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
