/**
 * Base aggregation functions for all platforms
 * Provides common analytics calculations that work across different media types
 */

import { BaseMediaRecord, BaseAnalytics, BaseFilterOptions } from '../../types'

export class BaseAggregations {
  /**
   * Apply filters to records
   */
  static applyFilters<T extends BaseMediaRecord>(
    records: T[],
    filters: BaseFilterOptions
  ): T[] {
    let filtered = records

    // Filter by timeframe
    if (filters.timeframe !== 'All') {
      filtered = this.filterByTimeframe(filtered, filters.timeframe)
    }

    // Filter by platform
    if (filters.platform && filters.platform !== 'All') {
      filtered = filtered.filter(record => record.platform === filters.platform)
    }

    // Filter by topics
    if (filters.topics && filters.topics.length > 0) {
      filtered = filtered.filter(record =>
        record.topics.some(topic => filters.topics!.includes(topic))
      )
    }

    // Filter by creators
    if (filters.creators && filters.creators.length > 0) {
      filtered = filtered.filter(record =>
        record.creator && filters.creators!.includes(record.creator)
      )
    }

    return filtered
  }

  /**
   * Filter records by timeframe
   */
  private static filterByTimeframe<T extends BaseMediaRecord>(
    records: T[],
    timeframe: string
  ): T[] {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    const currentQuarter = Math.ceil(currentMonth / 3)

    return records.filter(record => {
      if (!record.consumedAt) return false

      const recordDate = new Date(record.consumedAt)
      const recordYear = recordDate.getFullYear()
      const recordMonth = recordDate.getMonth() + 1
      const recordQuarter = Math.ceil(recordMonth / 3)

      switch (timeframe) {
        case 'YTD':
          return recordYear === currentYear
        case 'QTD':
          return recordYear === currentYear && recordQuarter === currentQuarter
        case 'MTD':
          return recordYear === currentYear && recordMonth === currentMonth
        case 'Last6M':
          const sixMonthsAgo = new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000)
          return recordDate >= sixMonthsAgo
        case 'Last12M':
          const twelveMonthsAgo = new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000)
          return recordDate >= twelveMonthsAgo
        default:
          return true
      }
    })
  }

  /**
   * Compute basic KPIs
   */
  static computeKPIs<T extends BaseMediaRecord>(
    records: T[],
    filters: BaseFilterOptions
  ): BaseAnalytics {
    const filtered = this.applyFilters(records, filters)
    
    const totalRecords = filtered.length
    const totalDuration = filtered.reduce((sum, record) => sum + (record.duration || 0), 0)
    
    const uniqueCreators = new Set(
      filtered
        .map(record => record.creator)
        .filter(Boolean)
    ).size

    const uniqueTopics = new Set(
      filtered.flatMap(record => record.topics)
    ).size

    const dates = filtered
      .map(record => record.consumedAt)
      .filter(Boolean)
      .sort()

    return {
      totalRecords,
      totalDuration,
      uniqueCreators,
      uniqueTopics,
      dateRange: {
        start: dates[0] || null,
        end: dates[dates.length - 1] || null
      }
    }
  }

  /**
   * Compute year-over-year comparison
   */
  static computeYoYComparison<T extends BaseMediaRecord>(
    records: T[],
    filters: BaseFilterOptions
  ): { current: number; previous: number; change: number; changePercent: number } {
    const now = new Date()
    const currentYear = now.getFullYear()
    const previousYear = currentYear - 1

    const currentRecords = records.filter(record => {
      if (!record.consumedAt) return false
      const recordYear = new Date(record.consumedAt).getFullYear()
      return recordYear === currentYear
    })

    const previousRecords = records.filter(record => {
      if (!record.consumedAt) return false
      const recordYear = new Date(record.consumedAt).getFullYear()
      return recordYear === previousYear
    })

    const current = this.applyFilters(currentRecords, filters).length
    const previous = this.applyFilters(previousRecords, filters).length
    const change = current - previous
    const changePercent = previous > 0 ? (change / previous) * 100 : 0

    return { current, previous, change, changePercent }
  }

  /**
   * Compute quarterly comparison
   */
  static computeQoQComparison<T extends BaseMediaRecord>(
    records: T[],
    filters: BaseFilterOptions
  ): { current: number; previous: number; change: number; changePercent: number } {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
    const previousQuarter = currentQuarter === 1 ? 4 : currentQuarter - 1
    const previousQuarterYear = currentQuarter === 1 ? currentYear - 1 : currentYear

    const currentRecords = records.filter(record => {
      if (!record.consumedAt) return false
      const recordDate = new Date(record.consumedAt)
      const recordYear = recordDate.getFullYear()
      const recordQuarter = Math.ceil((recordDate.getMonth() + 1) / 3)
      return recordYear === currentYear && recordQuarter === currentQuarter
    })

    const previousRecords = records.filter(record => {
      if (!record.consumedAt) return false
      const recordDate = new Date(record.consumedAt)
      const recordYear = recordDate.getFullYear()
      const recordQuarter = Math.ceil((recordDate.getMonth() + 1) / 3)
      return recordYear === previousQuarterYear && recordQuarter === previousQuarter
    })

    const current = this.applyFilters(currentRecords, filters).length
    const previous = this.applyFilters(previousRecords, filters).length
    const change = current - previous
    const changePercent = previous > 0 ? (change / previous) * 100 : 0

    return { current, previous, change, changePercent }
  }

  /**
   * Get top creators
   */
  static getTopCreators<T extends BaseMediaRecord>(
    records: T[],
    limit: number = 10
  ): Array<{ name: string; count: number; percentage: number }> {
    const creatorCounts = new Map<string, number>()
    
    records.forEach(record => {
      if (record.creator) {
        creatorCounts.set(record.creator, (creatorCounts.get(record.creator) || 0) + 1)
      }
    })

    const total = records.length
    return Array.from(creatorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
  }

  /**
   * Get top topics
   */
  static getTopTopics<T extends BaseMediaRecord>(
    records: T[],
    limit: number = 10
  ): Array<{ name: string; count: number; percentage: number }> {
    const topicCounts = new Map<string, number>()
    
    records.forEach(record => {
      record.topics.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
      })
    })

    const total = records.reduce((sum, record) => sum + record.topics.length, 0)
    return Array.from(topicCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([name, count]) => ({
        name,
        count,
        percentage: total > 0 ? (count / total) * 100 : 0
      }))
  }

  /**
   * Compute time-based trends
   */
  static computeTimeTrends<T extends BaseMediaRecord>(
    records: T[],
    groupBy: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Array<{ period: string; count: number; date: Date }> {
    const groups = new Map<string, { count: number; date: Date }>()

    records.forEach(record => {
      if (!record.consumedAt) return

      const date = new Date(record.consumedAt)
      let period: string

      switch (groupBy) {
        case 'day':
          period = date.toISOString().split('T')[0]
          break
        case 'week':
          const weekStart = new Date(date)
          weekStart.setDate(date.getDate() - date.getDay())
          period = weekStart.toISOString().split('T')[0]
          break
        case 'month':
          period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          break
        case 'year':
          period = String(date.getFullYear())
          break
        default:
          period = date.toISOString().split('T')[0]
      }

      const existing = groups.get(period)
      if (existing) {
        existing.count++
      } else {
        groups.set(period, { count: 1, date })
      }
    })

    return Array.from(groups.entries())
      .map(([period, data]) => ({ period, ...data }))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
  }
}
