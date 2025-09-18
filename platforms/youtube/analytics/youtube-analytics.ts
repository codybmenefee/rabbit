/**
 * YouTube-specific analytics functions
 * Extends base analytics with YouTube-specific metrics and calculations
 */

import { BaseAggregations } from '../../../packages/core/analytics/aggregations/base-aggregations'
import { YouTubeRecord, YouTubeFilterOptions, YouTubeAnalytics } from '../types'

export class YouTubeAnalyticsEngine extends BaseAggregations {
  /**
   * Compute YouTube-specific KPIs
   */
  static computeYouTubeKPIs(
    records: YouTubeRecord[],
    filters: YouTubeFilterOptions
  ): YouTubeAnalytics {
    const filtered = this.applyFilters(records, filters)
    
    const totalRecords = filtered.length
    const totalWatchTime = filtered.reduce((sum, record) => sum + (record.duration || 0), 0)
    const averageWatchTime = totalRecords > 0 ? totalWatchTime / totalRecords : 0
    
    const uniqueChannels = new Set(
      filtered
        .map(record => record.channelTitle)
        .filter(Boolean)
    ).size

    const uniqueTopics = new Set(
      filtered.flatMap(record => record.topics)
    ).size

    const dates = filtered
      .map(record => record.consumedAt)
      .filter(Boolean)
      .sort()

    // Top channels with watch time
    const channelStats = new Map<string, { count: number; watchTime: number }>()
    filtered.forEach(record => {
      if (record.channelTitle) {
        const existing = channelStats.get(record.channelTitle)
        if (existing) {
          existing.count++
          existing.watchTime += record.duration || 0
        } else {
          channelStats.set(record.channelTitle, {
            count: 1,
            watchTime: record.duration || 0
          })
        }
      }
    })

    const topChannels = Array.from(channelStats.entries())
      .sort((a, b) => b[1].watchTime - a[1].watchTime)
      .slice(0, 10)
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        watchTime: stats.watchTime,
        percentage: totalWatchTime > 0 ? (stats.watchTime / totalWatchTime) * 100 : 0
      }))

    // Top videos
    const videoStats = new Map<string, { title: string; channel: string; count: number; watchTime: number }>()
    filtered.forEach(record => {
      if (record.videoTitle && record.channelTitle) {
        const key = `${record.videoTitle}|${record.channelTitle}`
        const existing = videoStats.get(key)
        if (existing) {
          existing.count++
          existing.watchTime += record.duration || 0
        } else {
          videoStats.set(key, {
            title: record.videoTitle,
            channel: record.channelTitle,
            count: 1,
            watchTime: record.duration || 0
          })
        }
      }
    })

    const topVideos = Array.from(videoStats.values())
      .sort((a, b) => b.watchTime - a.watchTime)
      .slice(0, 10)

    // Product breakdown
    const productBreakdown = {
      youtube: filtered.filter(r => r.product === 'YouTube').length,
      youtubeMusic: filtered.filter(r => r.product === 'YouTube Music').length
    }

    // Viewing patterns
    const viewingPatterns = this.computeViewingPatterns(filtered)

    return {
      totalRecords,
      totalDuration: totalWatchTime,
      uniqueCreators: uniqueChannels,
      uniqueTopics,
      dateRange: {
        start: dates[0] || null,
        end: dates[dates.length - 1] || null
      },
      totalWatchTime,
      averageWatchTime,
      topChannels,
      topVideos,
      productBreakdown,
      viewingPatterns
    }
  }

  /**
   * Compute viewing patterns
   */
  private static computeViewingPatterns(records: YouTubeRecord[]): {
    averageSessionLength: number
    bingeSessions: number
    peakHours: number[]
    peakDays: number[]
  } {
    // Group records into sessions (30-minute gaps)
    const sessions: YouTubeRecord[][] = []
    let currentSession: YouTubeRecord[] = []
    let lastTimestamp: Date | null = null

    const sortedRecords = records
      .filter(r => r.consumedAt)
      .sort((a, b) => new Date(a.consumedAt!).getTime() - new Date(b.consumedAt!).getTime())

    sortedRecords.forEach(record => {
      const recordTime = new Date(record.consumedAt!)
      
      if (lastTimestamp) {
        const timeDiff = recordTime.getTime() - lastTimestamp.getTime()
        const thirtyMinutes = 30 * 60 * 1000
        
        if (timeDiff > thirtyMinutes) {
          // New session
          if (currentSession.length > 0) {
            sessions.push([...currentSession])
          }
          currentSession = [record]
        } else {
          // Same session
          currentSession.push(record)
        }
      } else {
        currentSession.push(record)
      }
      
      lastTimestamp = recordTime
    })

    if (currentSession.length > 0) {
      sessions.push(currentSession)
    }

    // Calculate session metrics
    const sessionLengths = sessions.map(session => {
      if (session.length < 2) return 0
      const start = new Date(session[0].consumedAt!)
      const end = new Date(session[session.length - 1].consumedAt!)
      return end.getTime() - start.getTime()
    })

    const averageSessionLength = sessionLengths.length > 0 
      ? sessionLengths.reduce((sum, length) => sum + length, 0) / sessionLengths.length
      : 0

    const bingeSessions = sessions.filter(session => session.length >= 5).length

    // Peak hours (0-23)
    const hourCounts = new Array(24).fill(0)
    records.forEach(record => {
      if (record.hour !== null) {
        hourCounts[record.hour]++
      }
    })
    const maxHourCount = Math.max(...hourCounts)
    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .filter(({ count }) => count >= maxHourCount * 0.8)
      .map(({ hour }) => hour)

    // Peak days (0-6, Sunday-Saturday)
    const dayCounts = new Array(7).fill(0)
    records.forEach(record => {
      if (record.dayOfWeek !== null) {
        dayCounts[record.dayOfWeek]++
      }
    })
    const maxDayCount = Math.max(...dayCounts)
    const peakDays = dayCounts
      .map((count, day) => ({ day, count }))
      .filter(({ count }) => count >= maxDayCount * 0.8)
      .map(({ day }) => day)

    return {
      averageSessionLength,
      bingeSessions,
      peakHours,
      peakDays
    }
  }

  /**
   * Compute channel loyalty metrics
   */
  static computeChannelLoyalty(records: YouTubeRecord[]): Array<{
    channel: string
    totalWatches: number
    uniqueVideos: number
    loyaltyScore: number
    averageWatchTime: number
  }> {
    const channelStats = new Map<string, {
      totalWatches: number
      uniqueVideos: Set<string>
      totalWatchTime: number
    }>()

    records.forEach(record => {
      if (record.channelTitle && record.videoTitle) {
        const existing = channelStats.get(record.channelTitle)
        if (existing) {
          existing.totalWatches++
          existing.uniqueVideos.add(record.videoTitle)
          existing.totalWatchTime += record.duration || 0
        } else {
          channelStats.set(record.channelTitle, {
            totalWatches: 1,
            uniqueVideos: new Set([record.videoTitle]),
            totalWatchTime: record.duration || 0
          })
        }
      }
    })

    return Array.from(channelStats.entries())
      .map(([channel, stats]) => {
        const loyaltyScore = stats.uniqueVideos.size > 0 
          ? stats.totalWatches / stats.uniqueVideos.size 
          : 0
        const averageWatchTime = stats.totalWatches > 0 
          ? stats.totalWatchTime / stats.totalWatches 
          : 0

        return {
          channel,
          totalWatches: stats.totalWatches,
          uniqueVideos: stats.uniqueVideos.size,
          loyaltyScore,
          averageWatchTime
        }
      })
      .sort((a, b) => b.loyaltyScore - a.loyaltyScore)
  }

  /**
   * Compute topic trends over time
   */
  static computeTopicTrends(
    records: YouTubeRecord[],
    groupBy: 'week' | 'month' | 'quarter' = 'month'
  ): Array<{
    period: string
    topics: Array<{ name: string; count: number; percentage: number }>
  }> {
    const timeGroups = new Map<string, Map<string, number>>()

    records.forEach(record => {
      if (!record.consumedAt) return

      const date = new Date(record.consumedAt)
      let period: string

      switch (groupBy) {
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          period = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'quarter':
          const quarter = Math.ceil((date.getMonth() + 1) / 3)
          period = `${date.getFullYear()}-Q${quarter}`
          break
        default:
          period = date.toISOString().split('T')[0]
      }

      if (!timeGroups.has(period)) {
        timeGroups.set(period, new Map())
      }

      const periodTopics = timeGroups.get(period)!
      record.topics.forEach(topic => {
        periodTopics.set(topic, (periodTopics.get(topic) || 0) + 1)
      })
    })

    return Array.from(timeGroups.entries())
      .map(([period, topicCounts]) => {
        const total = Array.from(topicCounts.values()).reduce((sum, count) => sum + count, 0)
        const topics = Array.from(topicCounts.entries())
          .map(([name, count]) => ({
            name,
            count,
            percentage: total > 0 ? (count / total) * 100 : 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        return { period, topics }
      })
      .sort((a, b) => a.period.localeCompare(b.period))
  }
}
