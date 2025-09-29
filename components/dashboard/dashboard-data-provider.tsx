'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { WatchRecord } from '@/lib/types'
import { MainDashboard } from './main-dashboard'
import { Loader2 } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { normalizeWatchRecord } from '@/lib/aggregations'

interface CachedMetrics {
  data: any
  timestamp: number
  userId: string
}

const CACHE_KEY = 'dashboard-metrics-cache'
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCachedMetrics(userId: string): CachedMetrics | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const parsed: CachedMetrics = JSON.parse(cached)

    // Check if cache is valid
    if (parsed.userId !== userId ||
        Date.now() - parsed.timestamp > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }

    return parsed
  } catch (error) {
    console.warn('Failed to read dashboard cache:', error)
    localStorage.removeItem(CACHE_KEY)
    return null
  }
}

function setCachedMetrics(userId: string, data: any): void {
  if (typeof window === 'undefined') return

  try {
    const cacheData: CachedMetrics = {
      data,
      timestamp: Date.now(),
      userId,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch (error) {
    console.warn('Failed to write dashboard cache:', error)
  }
}

interface DashboardDataProviderProps {
  className?: string
}

export function DashboardDataProvider({ className }: DashboardDataProviderProps) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const [cachedMetrics, setCachedMetrics] = useState<any>(null)

  // Check cache on mount
  useEffect(() => {
    if (isLoaded && userId) {
      const cached = getCachedMetrics(userId)
      if (cached) {
        setCachedMetrics(cached.data)
      }
    }
  }, [isLoaded, userId])

  // Use optimized server-side aggregated metrics
  const dashboardMetrics = useQuery(api.dashboard.dashboardMetrics, {})

  // Cache successful results
  useEffect(() => {
    if (dashboardMetrics && userId && !dashboardMetrics.isLoading) {
      setCachedMetrics(dashboardMetrics)
      setCachedMetrics(userId, dashboardMetrics)
    }
  }, [dashboardMetrics, userId])

  // Only load detailed records if user specifically needs them (lazy loading)
  const [showDetailedView, setShowDetailedView] = useState(false)
  const convexRecords = showDetailedView ? useQuery(api.dashboard.records, {}) : undefined

  const data: WatchRecord[] = useMemo(() => {
    if (!isLoaded || !showDetailedView || convexRecords === undefined) {
      return []
    }

    if (!Array.isArray(convexRecords)) {
      return []
    }

    return convexRecords.map(raw => {
      try {
        return normalizeWatchRecord(raw)
      } catch (error) {
        console.warn('Failed to normalize record:', raw, error)
        return {
          id: raw.id || `fallback-${Date.now()}`,
          watchedAt: null,
          videoId: null,
          videoTitle: 'Unknown Video',
          videoUrl: null,
          channelTitle: 'Unknown Channel',
          channelUrl: null,
          product: 'YouTube',
          topics: [],
          year: null,
          month: null,
          week: null,
          dayOfWeek: null,
          hour: null,
          yoyKey: null,
        }
      }
    })
  }, [convexRecords, isLoaded])

  // Show loading if auth is not loaded yet
  if (!isLoaded) {
    return (
      <div className={className}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-2 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-400" />
            <p className="text-sm text-slate-400">Loading...</p>
          </div>
        </div>
      </div>
    )
  }

  // Use cached metrics immediately, then update with fresh data
  const displayMetrics = dashboardMetrics || cachedMetrics

  return (
    <div className={className}>
      <MainDashboard
        metrics={displayMetrics}
        data={data}
        onShowDetails={() => setShowDetailedView(true)}
        showDetailedView={showDetailedView}
        isLoading={!displayMetrics}
      />
    </div>
  )
}
