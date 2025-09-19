'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { WatchRecord } from '@/types/records'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export default function AnalyticsPage() {
  const records = useQuery(api.dashboard.records, {})
  const isLoading = records === undefined
  const watchRecords = (records as WatchRecord[] | undefined) ?? []
  const [error] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-signal-green-500 mx-auto mb-4"></div>
          <p className="text-terminal-muted terminal-text">LOADING_ANALYTICS_STREAM...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center text-signal-red-400">
          <p className="terminal-text">ERROR: {error}</p>
        </div>
      </div>
    )
  }

  if (watchRecords.length === 0) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-terminal-text terminal-text mb-4">NO_DATA_STREAM_DETECTED</h2>
          <p className="text-terminal-muted terminal-text mb-6">
            Initialize data stream from main dashboard to access advanced analytics.
          </p>
          <Link 
            href="/"
            className="inline-flex items-center px-4 py-2 bg-signal-green-600 text-terminal-bg rounded-lg hover:bg-signal-green-500 transition-colors terminal-text"
          >
            RETURN_TO_DASHBOARD
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-bg">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-terminal-text terminal-text">ADVANCED_ANALYTICS</h1>
              <p className="text-terminal-muted text-sm mt-1 terminal-text">
                DEEP_STATISTICAL_ANALYSIS • {watchRecords.length.toLocaleString()} DATA_POINTS
              </p>
            </div>
          </motion.div>

          <AnalyticsDashboard data={watchRecords} />
        </div>
      </div>
    </div>
  )
}
