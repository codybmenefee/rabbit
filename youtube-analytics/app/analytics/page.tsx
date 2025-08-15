'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { WatchRecord } from '@/types/records'
import { watchHistoryStorage } from '@/lib/storage'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export default function AnalyticsPage() {
  const [watchRecords, setWatchRecords] = useState<WatchRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadData = async () => {
      try {
        const hasData = await watchHistoryStorage.hasData()
        if (hasData) {
          const records = await watchHistoryStorage.getRecords()
          setWatchRecords(records)
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        setError('Failed to load analytics data')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadData()
  }, [])

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