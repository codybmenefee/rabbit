'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { watchHistoryStorage } from '@/lib/storage'
import { WatchRecord, FilterOptions } from '@/types/records'
import { computeTopicEvolution, computeTopicQualityMetrics, computeTopicRecommendationImpact, computeTopicDiversityMetrics } from '@/lib/topic-aggregations'
import { TopicPortfolioDashboard } from '@/components/topics/topic-portfolio-dashboard'
import { InterestEvolutionChart } from '@/components/topics/interest-evolution-chart'
import { ContentQualityMetrics } from '@/components/topics/content-quality-metrics'
import { RecommendationImpactAnalysis } from '@/components/topics/recommendation-impact-analysis'
import { DashboardFilters } from '@/components/dashboard/dashboard-filters'
import { EmptyState } from '@/components/topics/empty-state'

export default function TopicsPage() {
  const [watchRecords, setWatchRecords] = useState<WatchRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filters, setFilters] = useState<FilterOptions>({
    timeframe: 'All',
    product: 'All',
    topics: [],
    channels: []
  })

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const records = await watchHistoryStorage.getRecords()
        setWatchRecords(records)
      } catch (error) {
        console.error('Failed to load watch records:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  // Compute topic analytics based on current filters
  const topicAnalytics = useMemo(() => {
    if (watchRecords.length === 0) return null

    try {
      const topicEvolution = computeTopicEvolution(watchRecords, filters)
      const qualityMetrics = computeTopicQualityMetrics(watchRecords, filters)
      const recommendationImpact = computeTopicRecommendationImpact(watchRecords, filters)
      const diversityMetrics = computeTopicDiversityMetrics(watchRecords, filters)

      return {
        topicEvolution,
        qualityMetrics,
        recommendationImpact,
        diversityMetrics
      }
    } catch (error) {
      console.error('Error computing topic analytics:', error)
      return null
    }
  }, [watchRecords, filters])

  // Get available filter options from the data
  const filterOptions = useMemo(() => {
    const topics = new Set<string>()
    const channels = new Set<string>()

    watchRecords.forEach(record => {
      record.topics.forEach(topic => topics.add(topic))
      if (record.channelTitle) {
        channels.add(record.channelTitle)
      }
    })

    return {
      availableTopics: Array.from(topics).sort(),
      availableChannels: Array.from(channels).sort().slice(0, 20) // Limit for UI
    }
  }, [watchRecords])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading your topic insights...</p>
        </div>
      </div>
    )
  }

  if (watchRecords.length === 0) {
    return <EmptyState />
  }

  if (!topicAnalytics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">Unable to compute topic analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Topic Analysis</h1>
              <p className="text-gray-400 text-lg">
                Deep dive into your content interests and viewing patterns
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">
                {topicAnalytics.diversityMetrics.totalTopics}
              </div>
              <div className="text-sm text-gray-400">Topics Discovered</div>
            </div>
          </div>

          {/* Filters */}
          <DashboardFilters
            filters={filters}
            onFiltersChange={setFilters}
            availableTopics={filterOptions.availableTopics}
            availableChannels={filterOptions.availableChannels}
          />
        </motion.div>

        {/* Topic Portfolio Dashboard */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <TopicPortfolioDashboard 
            data={topicAnalytics.topicEvolution}
            diversityMetrics={topicAnalytics.diversityMetrics}
          />
        </motion.div>

        {/* Interest Evolution Analysis */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <InterestEvolutionChart 
            data={topicAnalytics.topicEvolution}
            title="Interest Evolution Over Time"
          />
        </motion.div>

        {/* Content Quality Metrics & Recommendation Impact */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <ContentQualityMetrics 
              data={topicAnalytics.qualityMetrics}
            />
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.4 }}
          >
            <RecommendationImpactAnalysis 
              data={topicAnalytics.recommendationImpact}
            />
          </motion.div>
        </div>
      </div>
    </div>
  )
}