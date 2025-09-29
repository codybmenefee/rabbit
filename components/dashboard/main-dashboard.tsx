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

interface SimpleKPIMetrics {
  totalVideos: number
  uniqueChannels: number
}

interface MainDashboardProps {
  data: WatchRecord[]
}

export function MainDashboard({ data }: MainDashboardProps) {
  const metrics = useMemo(() => {
    const kpis = computeKPIMetrics(data, { timeframe: 'All', product: 'All' })
    return {
      totalVideos: kpis.totalVideos,
      uniqueChannels: kpis.uniqueChannels,
    }
  }, [data])

  // Simple daily trend (last 30 days, count only)
  const dailyTrend = useMemo(() => {
    if (data.length === 0) return []
    const recent = data.filter(r => r.watchedAt).slice(0, 30)
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
      .map(([date, videos]) => ({ date, videos }))
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-2xl border border-white/5 bg-slate-900/60">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-200">No data available</p>
          <p className="text-sm text-slate-400 mt-2">
            Data is pre-loaded in Convex. Check your account or contact support.
          </p>
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
            <p className="text-3xl font-bold text-white">{metrics.totalVideos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Unique Channels</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{metrics.uniqueChannels}</p>
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
              <BarChart data={dailyTrend}>
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
