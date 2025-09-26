import {
  WatchRecord,
  FilterOptions,
  TopicCount
} from '@/lib/types'
import { 
  startOfMonth, 
  startOfQuarter, 
  startOfYear,
  subDays,
  subMonths,
  subYears,
  isWithinInterval,
  format,
  parseISO,
  differenceInDays
} from 'date-fns'

// Extended interfaces for topic analysis
export interface TopicEvolutionData {
  topic: string
  timeline: {
    period: string
    count: number
    percentage: number
    trending: 'up' | 'down' | 'stable'
  }[]
  totalVideos: number
  averagePercentage: number
  growthRate: number
  seasonality: {
    peak: string
    low: string
  }
}

export interface TopicQualityMetrics {
  topic: string
  totalVideos: number
  educationalPercentage: number
  longFormPercentage: number
  qualityScore: number
  avgEngagementIndicator: number
}

export interface TopicRecommendationImpact {
  topic: string
  recommendedPercentage: number
  intentionalPercentage: number
  algorithmInfluence: 'high' | 'medium' | 'low'
  bubbleRisk: number
  diversityFromTopic: number
}

export interface TopicDiversityMetrics {
  totalTopics: number
  diversityIndex: number
  concentrationRatio: number
  balanceScore: number
  topicSpread: {
    educational: number
    entertainment: number
    mixed: number
  }
}

function applyFilters(records: WatchRecord[], filters: FilterOptions): WatchRecord[] {
  let filtered = [...records]
  const now = new Date()

  // Apply timeframe filter
  filtered = filtered.filter(r => r.watchedAt !== null)
  
  switch (filters.timeframe) {
    case 'MTD':
      filtered = filtered.filter(r => {
        const watchDate = parseISO(r.watchedAt!)
        return isWithinInterval(watchDate, { start: startOfMonth(now), end: now })
      })
      break
    case 'QTD':
      filtered = filtered.filter(r => {
        const watchDate = parseISO(r.watchedAt!)
        return isWithinInterval(watchDate, { start: startOfQuarter(now), end: now })
      })
      break
    case 'YTD':
      filtered = filtered.filter(r => {
        const watchDate = parseISO(r.watchedAt!)
        return isWithinInterval(watchDate, { start: startOfYear(now), end: now })
      })
      break
    case 'Last6M':
      filtered = filtered.filter(r => {
        const watchDate = parseISO(r.watchedAt!)
        return isWithinInterval(watchDate, { start: subMonths(now, 6), end: now })
      })
      break
    case 'Last12M':
      filtered = filtered.filter(r => {
        const watchDate = parseISO(r.watchedAt!)
        return isWithinInterval(watchDate, { start: subMonths(now, 12), end: now })
      })
      break
  }

  // Apply other filters
  if (filters.product !== 'All') {
    filtered = filtered.filter(r => r.product === filters.product)
  }

  if (filters.topics && filters.topics.length > 0) {
    filtered = filtered.filter(r => 
      r.topics.some(topic => filters.topics?.includes(topic))
    )
  }

  if (filters.channels && filters.channels.length > 0) {
    filtered = filtered.filter(r => 
      r.channelTitle && filters.channels?.includes(r.channelTitle)
    )
  }

  return filtered
}

export function computeTopicEvolution(records: WatchRecord[], filters: FilterOptions): TopicEvolutionData[] {
  const filtered = applyFilters(records, filters)
  const topicData = new Map<string, { timeline: Map<string, number>, total: number }>()
  
  // Initialize topic data structure
  const allTopics = new Set<string>()
  filtered.forEach(record => {
    record.topics.forEach(topic => allTopics.add(topic))
  })

  allTopics.forEach(topic => {
    topicData.set(topic, {
      timeline: new Map(),
      total: 0
    })
  })

  // Group records by month and topic
  filtered.forEach(record => {
    if (!record.watchedAt) return
    
    const watchDate = parseISO(record.watchedAt)
    const monthKey = format(watchDate, 'yyyy-MM')
    
    record.topics.forEach(topic => {
      const data = topicData.get(topic)!
      const currentCount = data.timeline.get(monthKey) || 0
      data.timeline.set(monthKey, currentCount + 1)
      data.total++
    })
  })

  // Calculate evolution metrics for each topic
  const result: TopicEvolutionData[] = []
  const totalVideos = filtered.length

  topicData.forEach((data, topic) => {
    const timeline = Array.from(data.timeline.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, count]) => ({
        period: format(new Date(period + '-01'), 'MMM yyyy'),
        count,
        percentage: (count / totalVideos) * 100,
        trending: calculateTrend(data.timeline, period) as 'up' | 'down' | 'stable'
      }))

    // Calculate growth rate (last 3 months vs previous 3 months)
    const growthRate = calculateGrowthRate(timeline)
    
    // Calculate seasonality
    const seasonality = calculateSeasonality(timeline)

    result.push({
      topic,
      timeline,
      totalVideos: data.total,
      averagePercentage: (data.total / totalVideos) * 100,
      growthRate,
      seasonality
    })
  })

  return result.sort((a, b) => b.totalVideos - a.totalVideos)
}

export function computeTopicQualityMetrics(records: WatchRecord[], filters: FilterOptions): TopicQualityMetrics[] {
  const filtered = applyFilters(records, filters)
  const topicMetrics = new Map<string, {
    total: number
    educational: number
    longForm: number
    qualityIndicators: number[]
  }>()

  // Educational keywords for content classification
  const educationalKeywords = [
    'tutorial', 'learn', 'course', 'education', 'explained', 'how to', 'guide',
    'lesson', 'teach', 'study', 'academic', 'research', 'analysis', 'review'
  ]

  // Long-form indicators (estimated from titles)
  const longFormIndicators = [
    'full', 'complete', 'entire', 'documentary', 'deep dive', 'comprehensive',
    'detailed', 'in-depth', 'extended', 'lecture', 'masterclass'
  ]

  filtered.forEach(record => {
    record.topics.forEach(topic => {
      if (!topicMetrics.has(topic)) {
        topicMetrics.set(topic, {
          total: 0,
          educational: 0,
          longForm: 0,
          qualityIndicators: []
        })
      }

      const metrics = topicMetrics.get(topic)!
      metrics.total++

      const title = record.videoTitle?.toLowerCase() || ''
      const channel = record.channelTitle?.toLowerCase() || ''
      const combined = `${title} ${channel}`

      // Check if educational
      if (educationalKeywords.some(keyword => combined.includes(keyword))) {
        metrics.educational++
      }

      // Check if long-form (estimated)
      if (longFormIndicators.some(indicator => combined.includes(indicator))) {
        metrics.longForm++
      }

      // Calculate quality score based on various factors
      let qualityScore = 0
      if (educationalKeywords.some(keyword => combined.includes(keyword))) qualityScore += 30
      if (longFormIndicators.some(indicator => combined.includes(indicator))) qualityScore += 20
      if (title.length > 50) qualityScore += 10 // Descriptive titles
      if (!title.includes('!!!') && !title.includes('???')) qualityScore += 10 // Not clickbait-y
      if (topic !== 'Other') qualityScore += 10 // Categorized content

      metrics.qualityIndicators.push(Math.min(qualityScore, 100))
    })
  })

  const result: TopicQualityMetrics[] = []
  
  topicMetrics.forEach((metrics, topic) => {
    const avgQualityScore = metrics.qualityIndicators.reduce((sum, score) => sum + score, 0) / metrics.qualityIndicators.length || 0
    
    result.push({
      topic,
      totalVideos: metrics.total,
      educationalPercentage: (metrics.educational / metrics.total) * 100,
      longFormPercentage: (metrics.longForm / metrics.total) * 100,
      qualityScore: Math.round(avgQualityScore),
      avgEngagementIndicator: Math.min(avgQualityScore + Math.random() * 20, 100) // Simulated engagement
    })
  })

  return result.sort((a, b) => b.totalVideos - a.totalVideos)
}

export function computeTopicRecommendationImpact(records: WatchRecord[], filters: FilterOptions): TopicRecommendationImpact[] {
  const filtered = applyFilters(records, filters)
  const topicImpact = new Map<string, {
    total: number
    recommended: number // Estimated based on various signals
    intentional: number // Direct searches, subscriptions
    diversityConnections: Set<string>
  }>()

  // Keywords that suggest recommended content
  const recommendedSignals = [
    'trending', 'viral', 'recommended', 'suggested', 'popular', 'hot',
    'breaking', 'latest', 'new', '#shorts'
  ]

  // Keywords that suggest intentional consumption
  const intentionalSignals = [
    'tutorial', 'how to', 'guide', 'review', 'comparison', 'vs',
    'explained', 'analysis', 'deep dive', 'complete'
  ]

  filtered.forEach(record => {
    record.topics.forEach(topic => {
      if (!topicImpact.has(topic)) {
        topicImpact.set(topic, {
          total: 0,
          recommended: 0,
          intentional: 0,
          diversityConnections: new Set()
        })
      }

      const impact = topicImpact.get(topic)!
      impact.total++

      const title = record.videoTitle?.toLowerCase() || ''
      const channel = record.channelTitle?.toLowerCase() || ''
      const combined = `${title} ${channel}`

      // Estimate if content was recommended vs intentional
      if (recommendedSignals.some(signal => combined.includes(signal))) {
        impact.recommended++
      } else if (intentionalSignals.some(signal => combined.includes(signal))) {
        impact.intentional++
      } else {
        // Default assumption: slight bias toward recommended for trending topics
        if (Math.random() > 0.6) {
          impact.recommended++
        } else {
          impact.intentional++
        }
      }

      // Track topic diversity connections
      record.topics.forEach(otherTopic => {
        if (otherTopic !== topic) {
          impact.diversityConnections.add(otherTopic)
        }
      })
    })
  })

  const result: TopicRecommendationImpact[] = []
  
  topicImpact.forEach((impact, topic) => {
    const recommendedPercentage = (impact.recommended / impact.total) * 100
    const intentionalPercentage = (impact.intentional / impact.total) * 100
    
    const algorithmInfluence = recommendedPercentage > 70 ? 'high' : 
                              recommendedPercentage > 40 ? 'medium' : 'low'
    
    const bubbleRisk = Math.min((100 - impact.diversityConnections.size) * 2, 100)
    
    result.push({
      topic,
      recommendedPercentage,
      intentionalPercentage,
      algorithmInfluence,
      bubbleRisk,
      diversityFromTopic: impact.diversityConnections.size
    })
  })

  return result.sort((a, b) => b.recommendedPercentage - a.recommendedPercentage)
}

export function computeTopicDiversityMetrics(records: WatchRecord[], filters: FilterOptions): TopicDiversityMetrics {
  const filtered = applyFilters(records, filters)
  const topicCounts = new Map<string, number>()
  
  // Count all topics
  filtered.forEach(record => {
    record.topics.forEach(topic => {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
    })
  })

  const totalTopics = topicCounts.size
  const totalVideos = filtered.length

  // Calculate diversity index (Shannon diversity)
  let diversityIndex = 0
  topicCounts.forEach(count => {
    const proportion = count / totalVideos
    diversityIndex -= proportion * Math.log2(proportion)
  })

  // Calculate concentration ratio (top 3 topics percentage)
  const sortedCounts = Array.from(topicCounts.values()).sort((a, b) => b - a)
  const top3Sum = sortedCounts.slice(0, 3).reduce((sum, count) => sum + count, 0)
  const concentrationRatio = (top3Sum / totalVideos) * 100

  // Calculate balance score
  const balanceScore = Math.max(0, 100 - concentrationRatio)

  // Categorize topics into educational/entertainment/mixed
  const educationalTopics = ['Education', 'Science', 'Technology', 'Finance']
  const entertainmentTopics = ['Entertainment', 'Gaming', 'Music', 'Sports']
  
  let educational = 0
  let entertainment = 0
  let mixed = 0

  topicCounts.forEach((count, topic) => {
    if (educationalTopics.includes(topic)) {
      educational += count
    } else if (entertainmentTopics.includes(topic)) {
      entertainment += count
    } else {
      mixed += count
    }
  })

  return {
    totalTopics,
    diversityIndex: Math.round(diversityIndex * 100) / 100,
    concentrationRatio: Math.round(concentrationRatio * 100) / 100,
    balanceScore: Math.round(balanceScore),
    topicSpread: {
      educational: Math.round((educational / totalVideos) * 100),
      entertainment: Math.round((entertainment / totalVideos) * 100),
      mixed: Math.round((mixed / totalVideos) * 100)
    }
  }
}

// Helper functions
function calculateTrend(timeline: Map<string, number>, currentPeriod: string): string {
  const periods = Array.from(timeline.keys()).sort()
  const currentIndex = periods.indexOf(currentPeriod)
  
  if (currentIndex < 2) return 'stable'
  
  const current = timeline.get(periods[currentIndex]) || 0
  const previous = timeline.get(periods[currentIndex - 1]) || 0
  const beforePrevious = timeline.get(periods[currentIndex - 2]) || 0
  
  const recentTrend = current - previous
  const previousTrend = previous - beforePrevious
  
  if (recentTrend > previousTrend * 1.2) return 'up'
  if (recentTrend < previousTrend * 0.8) return 'down'
  return 'stable'
}

function calculateGrowthRate(timeline: { period: string; count: number }[]): number {
  if (timeline.length < 6) return 0
  
  const recent3 = timeline.slice(-3).reduce((sum, item) => sum + item.count, 0)
  const previous3 = timeline.slice(-6, -3).reduce((sum, item) => sum + item.count, 0)
  
  if (previous3 === 0) return recent3 > 0 ? 100 : 0
  return ((recent3 - previous3) / previous3) * 100
}

function calculateSeasonality(timeline: { period: string; count: number }[]): { peak: string; low: string } {
  if (timeline.length < 4) {
    return { peak: 'Unknown', low: 'Unknown' }
  }
  
  const sorted = [...timeline].sort((a, b) => b.count - a.count)
  return {
    peak: sorted[0]?.period || 'Unknown',
    low: sorted[sorted.length - 1]?.period || 'Unknown'
  }
}