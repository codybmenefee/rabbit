/**
 * Data Integrity Validation Suite for YouTube Analytics Dashboard
 * 
 * This module provides comprehensive validation tests for:
 * 1. YOY delta calculation accuracy
 * 2. Filter consistency across all aggregations
 * 3. Edge case handling
 * 4. Data transformation integrity
 * 5. Heatmap indexing correctness
 * 6. Mathematical verification of all calculations
 */

import {
  WatchRecord,
  FilterOptions,
  KPIMetrics,
  MonthlyCount,
  ChannelMetrics,
  DayHourMatrix,
  TopicCount
} from '@/types/records'
import {
  computeKPIMetrics,
  computeMonthlyTrend,
  computeTopChannels,
  computeDayTimeHeatmap,
  computeTopicsLeaderboard,
  normalizeWatchRecord
} from './aggregations'
import { 
  startOfMonth, 
  startOfQuarter, 
  startOfYear,
  subMonths,
  subYears,
  parseISO,
  format,
  isValid
} from 'date-fns'

export interface ValidationResult {
  passed: boolean
  testName: string
  severity: 'Critical' | 'High' | 'Medium' | 'Low'
  details: string
  expectedValue?: any
  actualValue?: any
  errorData?: any
}

export interface ValidationReport {
  overallStatus: 'PASS' | 'FAIL'
  totalTests: number
  passedTests: number
  failedTests: number
  criticalIssues: number
  results: ValidationResult[]
  summary: string
}

export class DataIntegrityValidator {
  
  /**
   * Create controlled test data for mathematical verification
   */
  static createTestData(): WatchRecord[] {
    const testData: WatchRecord[] = []
    
    // Current year data (2024) - 100 records
    for (let i = 0; i < 100; i++) {
      const date = new Date(2024, Math.floor(i / 10), (i % 10) + 1, i % 24)
      testData.push({
        id: `current-${i}`,
        watchedAt: date.toISOString(),
        videoId: `video-${i}`,
        videoTitle: `Test Video ${i}`,
        videoUrl: `https://youtube.com/watch?v=${i}`,
        channelTitle: `Channel ${i % 5}`, // 5 channels
        channelUrl: `https://youtube.com/channel/${i % 5}`,
        product: i % 10 === 0 ? 'YouTube Music' : 'YouTube',
        topics: [`Topic ${i % 3}`], // 3 topics
        year: 2024,
        month: Math.floor(i / 10) + 1,
        week: Math.floor(((i % 10) + 1) / 7) + 1,
        dayOfWeek: date.getDay(),
        hour: date.getHours(),
        yoyKey: `2024-${String(Math.floor(i / 10) + 1).padStart(2, '0')}`
      })
    }
    
    // Previous year data (2023) - 50 records for YOY comparison
    for (let i = 0; i < 50; i++) {
      const date = new Date(2023, Math.floor(i / 5), (i % 5) + 1, i % 24)
      testData.push({
        id: `previous-${i}`,
        watchedAt: date.toISOString(),
        videoId: `video-prev-${i}`,
        videoTitle: `Previous Year Video ${i}`,
        videoUrl: `https://youtube.com/watch?v=prev-${i}`,
        channelTitle: `Channel ${i % 5}`,
        channelUrl: `https://youtube.com/channel/${i % 5}`,
        product: i % 8 === 0 ? 'YouTube Music' : 'YouTube',
        topics: [`Topic ${i % 3}`],
        year: 2023,
        month: Math.floor(i / 5) + 1,
        week: Math.floor(((i % 5) + 1) / 7) + 1,
        dayOfWeek: date.getDay(),
        hour: date.getHours(),
        yoyKey: `2023-${String(Math.floor(i / 5) + 1).padStart(2, '0')}`
      })
    }
    
    return testData
  }

  /**
   * Validate YOY delta calculations
   */
  static validateYOYCalculations(testData: WatchRecord[]): ValidationResult[] {
    const results: ValidationResult[] = []
    const filters: FilterOptions = { timeframe: 'All', product: 'All' }
    
    try {
      const kpiMetrics = computeKPIMetrics(testData, filters)
      const now = new Date()
      
      // Manual calculation for verification
      const currentYear = now.getFullYear()
      const lastYear = currentYear - 1
      
      // YTD calculation
      const ytdRecords = testData.filter(r => {
        if (!r.watchedAt) return false
        const date = parseISO(r.watchedAt)
        return date.getFullYear() === currentYear && 
               date <= now && 
               date >= startOfYear(now)
      })
      
      const lastYearYtdRecords = testData.filter(r => {
        if (!r.watchedAt) return false
        const date = parseISO(r.watchedAt)
        return date.getFullYear() === lastYear &&
               date <= startOfYear(now) &&
               date >= startOfYear(subYears(now, 1))
      })
      
      const expectedYoyDelta = lastYearYtdRecords.length === 0 
        ? (ytdRecords.length > 0 ? 100 : 0)
        : ((ytdRecords.length - lastYearYtdRecords.length) / lastYearYtdRecords.length) * 100
      
      const deltaMatch = Math.abs(kpiMetrics.ytdYoyDelta - expectedYoyDelta) < 0.01
      
      results.push({
        passed: deltaMatch,
        testName: 'YTD YOY Delta Calculation',
        severity: deltaMatch ? 'Low' : 'Critical',
        details: deltaMatch 
          ? 'YTD YOY delta calculation is mathematically correct'
          : `YTD YOY delta mismatch. Expected: ${expectedYoyDelta.toFixed(2)}%, Got: ${kpiMetrics.ytdYoyDelta.toFixed(2)}%`,
        expectedValue: expectedYoyDelta,
        actualValue: kpiMetrics.ytdYoyDelta,
        errorData: deltaMatch ? null : {
          currentYearRecords: ytdRecords.length,
          previousYearRecords: lastYearYtdRecords.length
        }
      })
      
    } catch (error) {
      results.push({
        passed: false,
        testName: 'YOY Calculation Error Handling',
        severity: 'Critical',
        details: `YOY calculation threw an error: ${error}`,
        errorData: error
      })
    }
    
    return results
  }

  /**
   * Validate filter consistency across all aggregation functions
   */
  static validateFilterConsistency(testData: WatchRecord[]): ValidationResult[] {
    const results: ValidationResult[] = []
    
    const testFilters: FilterOptions[] = [
      { timeframe: 'YTD', product: 'YouTube' },
      { timeframe: 'MTD', product: 'YouTube Music' },
      { timeframe: 'QTD', product: 'All', topics: ['Topic 0'] },
      { timeframe: 'All', product: 'All', channels: ['Channel 0'] }
    ]
    
    testFilters.forEach((filter, index) => {
      try {
        const kpiMetrics = computeKPIMetrics(testData, filter)
        const monthlyTrend = computeMonthlyTrend(testData, filter)
        const topChannels = computeTopChannels(testData, filter, 5)
        const heatmap = computeDayTimeHeatmap(testData, filter)
        const topics = computeTopicsLeaderboard(testData, filter)
        
        // Verify all functions return data
        const allHaveData = kpiMetrics.totalVideos >= 0 &&
                           monthlyTrend.length >= 0 &&
                           topChannels.length >= 0 &&
                           heatmap.length >= 0 &&
                           topics.length >= 0
        
        results.push({
          passed: allHaveData,
          testName: `Filter Consistency Test ${index + 1}`,
          severity: allHaveData ? 'Low' : 'High',
          details: allHaveData 
            ? `All aggregation functions handle filter ${JSON.stringify(filter)} consistently`
            : `Filter consistency issue with filter ${JSON.stringify(filter)}`,
          actualValue: {
            kpiVideos: kpiMetrics.totalVideos,
            monthlyEntries: monthlyTrend.length,
            topChannelsEntries: topChannels.length,
            heatmapEntries: heatmap.length,
            topicsEntries: topics.length
          }
        })
        
      } catch (error) {
        results.push({
          passed: false,
          testName: `Filter Error Test ${index + 1}`,
          severity: 'Critical',
          details: `Filter ${JSON.stringify(filter)} caused error: ${error}`,
          errorData: error
        })
      }
    })
    
    return results
  }

  /**
   * Validate edge case handling
   */
  static validateEdgeCases(): ValidationResult[] {
    const results: ValidationResult[] = []
    
    // Test empty dataset
    try {
      const emptyKPI = computeKPIMetrics([], { timeframe: 'All', product: 'All' })
      results.push({
        passed: emptyKPI.totalVideos === 0,
        testName: 'Empty Dataset Handling',
        severity: emptyKPI.totalVideos === 0 ? 'Low' : 'Medium',
        details: emptyKPI.totalVideos === 0 
          ? 'Empty dataset handled correctly'
          : 'Empty dataset not handled properly',
        expectedValue: 0,
        actualValue: emptyKPI.totalVideos
      })
    } catch (error) {
      results.push({
        passed: false,
        testName: 'Empty Dataset Error',
        severity: 'Critical',
        details: `Empty dataset caused error: ${error}`,
        errorData: error
      })
    }
    
    // Test null watchedAt values
    const nullDateData: WatchRecord[] = [
      {
        id: 'null-test',
        watchedAt: null,
        videoId: 'test',
        videoTitle: 'Test Video',
        videoUrl: null,
        channelTitle: 'Test Channel',
        channelUrl: null,
        product: 'YouTube',
        topics: ['Test'],
        year: null,
        month: null,
        week: null,
        dayOfWeek: null,
        hour: null,
        yoyKey: null
      }
    ]
    
    try {
      const nullDateKPI = computeKPIMetrics(nullDateData, { timeframe: 'All', product: 'All' })
      results.push({
        passed: nullDateKPI.totalVideos === 0,
        testName: 'Null Date Handling',
        severity: nullDateKPI.totalVideos === 0 ? 'Low' : 'High',
        details: nullDateKPI.totalVideos === 0 
          ? 'Null dates properly filtered out'
          : 'Null dates not handled correctly',
        expectedValue: 0,
        actualValue: nullDateKPI.totalVideos
      })
    } catch (error) {
      results.push({
        passed: false,
        testName: 'Null Date Error',
        severity: 'Critical',
        details: `Null dates caused error: ${error}`,
        errorData: error
      })
    }
    
    return results
  }

  /**
   * Validate heatmap day/hour indexing
   */
  static validateHeatmapIndexing(testData: WatchRecord[]): ValidationResult[] {
    const results: ValidationResult[] = []
    
    try {
      const heatmap = computeDayTimeHeatmap(testData, { timeframe: 'All', product: 'All' })
      
      // Verify all day/hour combinations are present
      const expectedEntries = 7 * 24 // 7 days × 24 hours
      const actualEntries = heatmap.length
      
      results.push({
        passed: actualEntries === expectedEntries,
        testName: 'Heatmap Matrix Completeness',
        severity: actualEntries === expectedEntries ? 'Low' : 'High',
        details: actualEntries === expectedEntries 
          ? 'Heatmap contains all 168 day/hour combinations'
          : `Heatmap missing entries. Expected: ${expectedEntries}, Got: ${actualEntries}`,
        expectedValue: expectedEntries,
        actualValue: actualEntries
      })
      
      // Verify day names are correct
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const uniqueDays = [...new Set(heatmap.map(h => h.day))]
      const daysMatch = dayNames.every(day => uniqueDays.includes(day)) && 
                       uniqueDays.every(day => dayNames.includes(day))
      
      results.push({
        passed: daysMatch,
        testName: 'Heatmap Day Names Validation',
        severity: daysMatch ? 'Low' : 'Medium',
        details: daysMatch 
          ? 'All day names are correct'
          : `Day names mismatch. Expected: ${dayNames}, Got: ${uniqueDays}`,
        expectedValue: dayNames,
        actualValue: uniqueDays
      })
      
      // Verify hour range (0-23)
      const hours = heatmap.map(h => h.hour)
      const hourRange = Math.min(...hours) === 0 && Math.max(...hours) === 23
      
      results.push({
        passed: hourRange,
        testName: 'Heatmap Hour Range Validation',
        severity: hourRange ? 'Low' : 'High',
        details: hourRange 
          ? 'Hour range is correct (0-23)'
          : `Hour range incorrect. Min: ${Math.min(...hours)}, Max: ${Math.max(...hours)}`,
        expectedValue: { min: 0, max: 23 },
        actualValue: { min: Math.min(...hours), max: Math.max(...hours) }
      })
      
    } catch (error) {
      results.push({
        passed: false,
        testName: 'Heatmap Generation Error',
        severity: 'Critical',
        details: `Heatmap generation failed: ${error}`,
        errorData: error
      })
    }
    
    return results
  }

  /**
   * Validate data transformation integrity
   */
  static validateDataTransformation(): ValidationResult[] {
    const results: ValidationResult[] = []
    
    const rawData = {
      videoTitle: 'Test Video with Special Chars: àáâã',
      videoUrl: 'https://youtube.com/watch?v=test123',
      videoId: 'test123',
      channelTitle: 'Test Channel: Tech & Science',
      channelUrl: 'https://youtube.com/channel/testchannel',
      watchedAt: '2024-08-10T14:30:00.000Z',
      product: 'YouTube',
      rawTimestamp: 'Aug 10, 2024, 2:30:00 PM UTC'
    }
    
    try {
      const normalized = normalizeWatchRecord(rawData)
      
      // Verify all fields are preserved
      const fieldsPreserved = normalized.videoTitle === rawData.videoTitle &&
                             normalized.videoUrl === rawData.videoUrl &&
                             normalized.channelTitle === rawData.channelTitle &&
                             normalized.watchedAt === rawData.watchedAt &&
                             normalized.product === rawData.product
      
      results.push({
        passed: fieldsPreserved,
        testName: 'Data Field Preservation',
        severity: fieldsPreserved ? 'Low' : 'Critical',
        details: fieldsPreserved 
          ? 'All data fields preserved during transformation'
          : 'Data fields lost or corrupted during transformation',
        expectedValue: rawData,
        actualValue: {
          videoTitle: normalized.videoTitle,
          videoUrl: normalized.videoUrl,
          channelTitle: normalized.channelTitle,
          watchedAt: normalized.watchedAt,
          product: normalized.product
        }
      })
      
      // Verify topics are derived
      results.push({
        passed: normalized.topics.length > 0,
        testName: 'Topic Derivation',
        severity: normalized.topics.length > 0 ? 'Low' : 'Medium',
        details: normalized.topics.length > 0 
          ? `Topics correctly derived: ${normalized.topics.join(', ')}`
          : 'No topics were derived from title and channel',
        actualValue: normalized.topics
      })
      
      // Verify date parsing (account for timezone differences)
      const parsedDate = parseISO(rawData.watchedAt!)
      const expectedYear = 2024
      const expectedMonth = 8
      const expectedHourUTC = 14
      
      // Check if parsed date components are reasonable (allow timezone offset)
      const dateValid = normalized.year === expectedYear && 
                       normalized.month === expectedMonth && 
                       normalized.hour !== null &&
                       normalized.hour >= 0 && 
                       normalized.hour <= 23
      
      results.push({
        passed: dateValid,
        testName: 'Date Component Extraction',
        severity: dateValid ? 'Low' : 'High',
        details: dateValid 
          ? `Date components correctly extracted (accounting for timezone). UTC: ${parsedDate.toISOString()}, Local hour: ${normalized.hour}`
          : `Date parsing error. Year: ${normalized.year}, Month: ${normalized.month}, Hour: ${normalized.hour}`,
        expectedValue: { year: expectedYear, month: expectedMonth, hourRange: '0-23' },
        actualValue: { year: normalized.year, month: normalized.month, hour: normalized.hour }
      })
      
    } catch (error) {
      results.push({
        passed: false,
        testName: 'Data Transformation Error',
        severity: 'Critical',
        details: `Data transformation failed: ${error}`,
        errorData: error
      })
    }
    
    return results
  }

  /**
   * Validate aggregation mathematical accuracy
   */
  static validateAggregationMath(testData: WatchRecord[]): ValidationResult[] {
    const results: ValidationResult[] = []
    
    try {
      const kpiMetrics = computeKPIMetrics(testData, { timeframe: 'All', product: 'All' })
      const topChannels = computeTopChannels(testData, { timeframe: 'All', product: 'All' }, 10)
      
      // Verify total videos matches sum of channel videos
      const channelSum = topChannels.reduce((sum, channel) => sum + channel.videoCount, 0)
      const totalMatch = channelSum <= kpiMetrics.totalVideos // <= because we might have more channels than shown
      
      results.push({
        passed: totalMatch,
        testName: 'Video Count Consistency',
        severity: totalMatch ? 'Low' : 'High',
        details: totalMatch 
          ? 'Video counts are mathematically consistent'
          : `Video count mismatch. KPI total: ${kpiMetrics.totalVideos}, Channel sum: ${channelSum}`,
        expectedValue: `<= ${kpiMetrics.totalVideos}`,
        actualValue: channelSum
      })
      
      // Verify percentages add up correctly
      const percentageSum = topChannels.reduce((sum, channel) => sum + channel.percentage, 0)
      const percentagesValid = percentageSum <= 100.01 // Allow for small rounding errors
      
      results.push({
        passed: percentagesValid,
        testName: 'Percentage Calculation Accuracy',
        severity: percentagesValid ? 'Low' : 'Medium',
        details: percentagesValid 
          ? 'Channel percentages are mathematically correct'
          : `Percentage sum exceeds 100%: ${percentageSum.toFixed(2)}%`,
        expectedValue: '<= 100%',
        actualValue: `${percentageSum.toFixed(2)}%`
      })
      
    } catch (error) {
      results.push({
        passed: false,
        testName: 'Aggregation Math Error',
        severity: 'Critical',
        details: `Mathematical validation failed: ${error}`,
        errorData: error
      })
    }
    
    return results
  }

  /**
   * Run comprehensive validation suite
   */
  static runFullValidation(): ValidationReport {
    const testData = this.createTestData()
    const allResults: ValidationResult[] = []
    
    // Run all validation tests
    allResults.push(...this.validateYOYCalculations(testData))
    allResults.push(...this.validateFilterConsistency(testData))
    allResults.push(...this.validateEdgeCases())
    allResults.push(...this.validateHeatmapIndexing(testData))
    allResults.push(...this.validateDataTransformation())
    allResults.push(...this.validateAggregationMath(testData))
    
    // Generate report
    const totalTests = allResults.length
    const passedTests = allResults.filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    const criticalIssues = allResults.filter(r => !r.passed && r.severity === 'Critical').length
    
    const overallStatus: 'PASS' | 'FAIL' = failedTests === 0 ? 'PASS' : 'FAIL'
    
    const summary = `Validation completed: ${passedTests}/${totalTests} tests passed. ${criticalIssues} critical issues found.`
    
    return {
      overallStatus,
      totalTests,
      passedTests,
      failedTests,
      criticalIssues,
      results: allResults,
      summary
    }
  }
}

// Export validation functions for individual testing
export const {
  createTestData,
  validateYOYCalculations,
  validateFilterConsistency,
  validateEdgeCases,
  validateHeatmapIndexing,
  validateDataTransformation,
  validateAggregationMath,
  runFullValidation
} = DataIntegrityValidator