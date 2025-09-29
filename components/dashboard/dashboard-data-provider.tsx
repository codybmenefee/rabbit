'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { WatchRecord } from '@/lib/types'
import { MainDashboard } from './main-dashboard'
import { Loader2 } from 'lucide-react'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { normalizeWatchRecord } from '@/lib/aggregations'

interface DashboardDataProviderProps {
  className?: string
}

export function DashboardDataProvider({ className }: DashboardDataProviderProps) {
  const { isLoaded, isSignedIn } = useAuth()
  const [loading, setLoading] = useState(true)

  const convexRecords = useQuery(api.dashboard.records, {})

  const data: WatchRecord[] = useMemo(() => {
    if (!isLoaded || convexRecords === undefined) {
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

  useEffect(() => {
    if (isLoaded) {
      setLoading(false)
    }
  }, [isLoaded])

  if (loading) {
    return (
      <div className={className}>
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="space-y-2 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-purple-400" />
            <p className="text-sm text-slate-400">Fetching your data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={className}>
      <MainDashboard data={data} />
    </div>
  )
}
