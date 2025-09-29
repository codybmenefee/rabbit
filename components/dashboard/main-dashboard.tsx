'use client'

import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WatchRecord, KPIMetrics } from '@/lib/types'
import { computeKPIMetrics } from '@/lib/aggregations'

interface DashboardMetrics {
  totalVideos: number
  uniqueChannels: number
  recentActivity: Array<{ date: string; videos: number }>
}

interface MainDashboardProps {
  metrics?: DashboardMetrics | undefined
  data: WatchRecord[]
  onShowDetails?: () => void
  showDetailedView?: boolean
  isLoading?: boolean
}

export function MainDashboard({ metrics, data, onShowDetails, showDetailedView, isLoading }: MainDashboardProps) {
  // Use server-computed metrics if available, otherwise compute client-side as fallback
  const displayMetrics = useMemo(() => {
    if (metrics) {
      return {
        totalVideos: metrics.totalVideos,
        uniqueChannels: metrics.uniqueChannels,
      }
    }

    // Fallback to client-side computation if server metrics not available
    const kpis = computeKPIMetrics(data, { timeframe: 'All', product: 'All' })
    return {
      totalVideos: kpis.totalVideos,
      uniqueChannels: kpis.uniqueChannels,
    }
  }, [metrics, data])

  // Use server-computed recent activity if available
  const dailyTrend = useMemo(() => {
    if (metrics && metrics.recentActivity) {
      // Limit chart data points for performance (max 30 days to prevent chart overcrowding)
      return metrics.recentActivity.slice(-30)
    }

    // Fallback to client-side computation with performance limits
    if (data.length === 0) return []
    const recent = data.filter(r => r.watchedAt).slice(0, 1000) // Limit processing for performance
    const byDay = new Map<string, number>()
    recent.forEach(r => {
      if (r.watchedAt) {
        const date = new Date(r.watchedAt)
        const key = date.toISOString().slice(0, 10)
        byDay.set(key, (byDay.get(key) ?? 0) + 1)
      }
    })
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30) // Keep only last 30 days for chart performance
      .map(([date, videos]) => ({ date, videos }))
  }, [metrics, data])

  // Show loading state while metrics are being fetched
  if (isLoading && !metrics) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/5 bg-slate-900/60">
        <div className="text-center">
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-sm text-slate-400">Loading dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (displayMetrics.totalVideos === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/5 bg-slate-900/60">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-200">No data available</p>
          <p className="text-sm text-slate-400 mt-2">
            Upload your YouTube watch history to get started.
          </p>
          {!showDetailedView && onShowDetails && (
            <button
              onClick={onShowDetails}
              className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors"
            >
              View Details
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{displayMetrics.totalVideos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Unique Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{displayMetrics.uniqueChannels}</p>
          </CardContent>
        </Card>
      </div>

      {/* Simple Bar Chart for Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity (Videos per Day)</CardTitle>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={dailyTrend} key={`chart-${dailyTrend.length}`}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <Tooltip />
                <Bar dataKey="videos" fill="#8b5cf6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
