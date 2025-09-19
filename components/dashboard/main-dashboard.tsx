'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FilterOptions, WatchRecord, KPIMetrics, MonthlyCount, ChannelMetrics, DayHourMatrix, TopicCount } from '@/types/records'
import { computeKPIMetrics, computeMonthlyTrend, computeTopChannels, computeDayTimeHeatmap, computeTopicsLeaderboard } from '@/lib/aggregations'
import { DashboardFilters } from './dashboard-filters'
import { KPICards, KPISummaryCard } from './kpi-cards'
import { MonthlyTrendChart, SimpleMonthlyLineChart } from './monthly-trend-chart'
import { TopChannelsChart, CompactChannelsList } from './top-channels-chart'
import { DayTimeHeatmap } from './day-time-heatmap'
import { TopicsLeaderboard, CompactTopicsList } from './topics-leaderboard'

interface MainDashboardProps {
  data: WatchRecord[]
}

export function MainDashboard({ data }: MainDashboardProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    timeframe: 'All',
    product: 'All',
    topics: [],
    channels: []
  })

  // Compute all analytics based on current filters
  const analytics = useMemo(() => {
    try {
      const kpiMetrics = computeKPIMetrics(data, filters)
      const monthlyTrend = computeMonthlyTrend(data, filters)
      const topChannels = computeTopChannels(data, filters, 10)
      const dayTimeHeatmap = computeDayTimeHeatmap(data, filters)
      const topicsLeaderboard = computeTopicsLeaderboard(data, filters)

      return {
        kpiMetrics,
        monthlyTrend,
        topChannels,
        dayTimeHeatmap,
        topicsLeaderboard
      }
    } catch (error) {
      console.error('Error computing analytics:', error)
      return {
        kpiMetrics: {
          totalVideos: 0,
          uniqueChannels: 0,
          totalWatchTime: 0,
          ytdVideos: 0,
          qtdVideos: 0,
          mtdVideos: 0,
          ytdYoyDelta: 0,
          qtdYoyDelta: 0,
          mtdYoyDelta: 0
        } as KPIMetrics,
        monthlyTrend: [] as MonthlyCount[],
        topChannels: [] as ChannelMetrics[],
        dayTimeHeatmap: [] as DayHourMatrix[],
        topicsLeaderboard: [] as TopicCount[]
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
        <div className="text-center space-y-2 terminal-text">
          <div className="text-lg font-medium">NO_DATA_STREAM_AVAILABLE</div>
          <div className="text-sm">INITIALIZE_WATCH_HISTORY_PIPELINE</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <DashboardFilters
        filters={filters}
        onFiltersChange={setFilters}
        availableTopics={filterOptions.availableTopics}
        availableChannels={filterOptions.availableChannels}
      />

      {/* KPI Cards */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <KPICards metrics={analytics.kpiMetrics} />
      </motion.div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <MonthlyTrendChart 
            data={analytics.monthlyTrend}
            height={350}
          />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <TopChannelsChart 
            data={analytics.topChannels}
            height={350}
          />
        </motion.div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          className="lg:col-span-2"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <DayTimeHeatmap data={analytics.dayTimeHeatmap} />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        >
          <TopicsLeaderboard 
            data={analytics.topicsLeaderboard}
            limit={8}
          />
        </motion.div>
      </div>

      {/* Summary Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        <KPISummaryCard metrics={analytics.kpiMetrics} />
      </motion.div>

      {/* Compact Views for Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <CompactChannelsList 
            data={analytics.topChannels}
            title="Top 5 Channels"
            limit={5}
          />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.8 }}
        >
          <CompactTopicsList 
            data={analytics.topicsLeaderboard}
            title="Popular Topics"
            limit={8}
          />
        </motion.div>
      </div>
    </div>
  )
}

// Sample data generator for testing
export function generateSampleData(): WatchRecord[] {
  const topics = ['Technology', 'Education', 'Gaming', 'Music', 'Science', 'Finance']
  const channels = ['Tech Channel', 'Edu Hub', 'Game Zone', 'Music World', 'Science Today', 'Finance Pro']
  const sampleData: WatchRecord[] = []

  const startDate = new Date('2023-01-01')
  const endDate = new Date('2024-08-10')

  for (let i = 0; i < 500; i++) {
    const randomDate = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()))
    const randomChannel = channels[Math.floor(Math.random() * channels.length)]
    const randomTopics = [topics[Math.floor(Math.random() * topics.length)]]
    
    sampleData.push({
      id: `sample-${i}`,
      watchedAt: randomDate.toISOString(),
      videoId: `video-${i}`,
      videoTitle: `Sample Video ${i + 1}`,
      videoUrl: `https://youtube.com/watch?v=video-${i}`,
      channelTitle: randomChannel,
      channelUrl: `https://youtube.com/channel/channel-${i}`,
      product: Math.random() > 0.1 ? 'YouTube' : 'YouTube Music',
      topics: randomTopics,
      year: randomDate.getFullYear(),
      month: randomDate.getMonth() + 1,
      week: Math.floor((randomDate.getDate() - 1) / 7) + 1,
      dayOfWeek: randomDate.getDay(),
      hour: randomDate.getHours(),
      yoyKey: `${randomDate.getFullYear()}-${String(randomDate.getMonth() + 1).padStart(2, '0')}`
    })
  }

  return sampleData
}