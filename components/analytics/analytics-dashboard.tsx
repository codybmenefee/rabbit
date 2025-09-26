'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FilterOptions, WatchRecord } from '@/lib/types'
import { DashboardFilters } from '@/components/dashboard/dashboard-filters'
import { computeAdvancedKPIs, computeSessionAnalysis, computeTimeSeriesData, computeViewingPatterns } from '@/lib/advanced-analytics'
import { AdvancedKPICards } from './advanced-kpi-cards'
import { SessionAnalysisCard } from './session-analysis-card'
import { TimeSeriesChart } from './time-series-chart'
import { ViewingPatternsCard } from './viewing-patterns-card'
import { StatisticalDeepDive } from './statistical-deep-dive'
import { ExportInsights } from './export-insights'

interface AnalyticsDashboardProps {
  data: WatchRecord[]
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    timeframe: 'All',
    product: 'All',
    topics: [],
    channels: []
  })

  // Compute all advanced analytics based on current filters
  const analytics = useMemo(() => {
    try {
      const advancedKPIs = computeAdvancedKPIs(data, filters)
      const sessionAnalysis = computeSessionAnalysis(data)
      const videoTimeSeries = computeTimeSeriesData(data, 'videos', 'daily')
      const channelTimeSeries = computeTimeSeriesData(data, 'channels', 'weekly')
      const viewingPatterns = computeViewingPatterns(data)

      return {
        advancedKPIs,
        sessionAnalysis,
        videoTimeSeries,
        channelTimeSeries,
        viewingPatterns
      }
    } catch (error) {
      console.error('Error computing advanced analytics:', error)
      return {
        advancedKPIs: computeAdvancedKPIs([], filters),
        sessionAnalysis: computeSessionAnalysis([]),
        videoTimeSeries: [],
        channelTimeSeries: [],
        viewingPatterns: []
      }
    }
  }, [data, filters])

  // Get available filter options from the data
  const filterOptions = useMemo(() => {
    const topics = new Set<string>()
    const channels = new Set<string>()

    data.forEach(record => {
      record.topics.forEach(topic => topics.add(topic))
      if (record.channelTitle) {
        channels.add(record.channelTitle)
      }
    })

    return {
      availableTopics: Array.from(topics).sort(),
      availableChannels: Array.from(channels).sort().slice(0, 20) // Limit for UI
    }
  }, [data])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-terminal-muted">
        <div className="text-center space-y-2">
          <div className="text-lg font-medium terminal-text">NO_DATA_STREAM</div>
          <div className="text-sm terminal-text">Initialize data from main dashboard to access analytics</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Filters */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        <DashboardFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableTopics={filterOptions.availableTopics}
          availableChannels={filterOptions.availableChannels}
        />
      </motion.div>

      {/* Advanced KPI Cards */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <AdvancedKPICards metrics={analytics.advancedKPIs} />
      </motion.div>

      {/* Time Series Analysis */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <TimeSeriesChart
          title="DAILY_VIDEO_CONSUMPTION"
          data={analytics.videoTimeSeries}
          color="#10B981"
          height={300}
        />
        <TimeSeriesChart
          title="WEEKLY_CHANNEL_DISCOVERY"
          data={analytics.channelTimeSeries}
          color="#8B5CF6"
          height={300}
        />
      </motion.div>

      {/* Session & Pattern Analysis */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <SessionAnalysisCard analysis={analytics.sessionAnalysis} />
        <ViewingPatternsCard patterns={analytics.viewingPatterns} />
      </motion.div>

      {/* Statistical Deep Dive */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <StatisticalDeepDive data={data} filters={filters} />
      </motion.div>

      {/* Export & Insights */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <ExportInsights data={data} analytics={analytics} />
      </motion.div>
    </div>
  )
}