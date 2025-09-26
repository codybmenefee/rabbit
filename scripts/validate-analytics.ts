/**
 * Advanced Analytics Data Integrity Validation
 * 
 * This TypeScript validation suite tests the accuracy and reliability of the
 * newly implemented Analytics page features.
 */

import { 
  computeAdvancedKPIs, 
  computeSessionAnalysis, 
  computeTimeSeriesData, 
  computeViewingPatterns,
  AdvancedKPIMetrics,
  SessionAnalysis 
} from '../lib/advanced-analytics'
import { generateDemoData } from '../lib/demo-data'
import { computeKPIMetrics } from '../lib/aggregations'
import { WatchRecord } from '../lib/types'

// Validation results tracking
interface ValidationResult {
  category: string
  test: string
  passed: boolean
  issue?: string
  severity: 'critical' | 'high' | 'medium' | 'low'
}

const results: ValidationResult[] = []

function addResult(category: string, test: string, passed: boolean, issue?: string, severity: 'critical' | 'high' | 'medium' | 'low' = 'medium') {
  results.push({ category, test, passed, issue, severity })
  const status = passed ? '✅' : '❌'
  const severityIcon = severity === 'critical' ? '🚨' : severity === 'high' ? '⚠️' : severity === 'medium' ? '🔸' : '💡'
  console.log(`${status} ${severityIcon} [${category}] ${test}${issue ? ` - ${issue}` : ''}`)
}

// Utility functions for validation
function validateRange(value: number, min: number, max: number, label: string): { valid: boolean, issue?: string } {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, issue: `${label}: Expected number, got ${typeof value}` }
  }
  if (value < min || value > max) {
    return { valid: false, issue: `${label}: Value ${value} outside expected range [${min}, ${max}]` }
  }
  return { valid: true }
}

function validateNonNegative(value: number, label: string): { valid: boolean, issue?: string } {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    return { valid: false, issue: `${label}: Expected non-negative number, got ${value}` }
  }
  return { valid: true }
}

// Generate test data
const { records } = generateDemoData()
console.log(`🧪 Generated ${records.length} test records for validation\n`)

console.log('🔍 DATA INTEGRITY VALIDATION SUITE')
console.log('=' + '='.repeat(60))

// TEST SUITE 1: Data Processing Accuracy
console.log('\n📊 Testing Data Processing Accuracy...')

try {
  const advancedKPIs = computeAdvancedKPIs(records)
  
  // Required fields validation
  const requiredFields: (keyof AdvancedKPIMetrics)[] = [
    'totalVideos', 'uniqueChannels', 'estimatedWatchTime', 'avgVideosPerDay',
    'avgSessionLength', 'contentDiversityIndex', 'repeatChannelRate', 
    'discoveryRate', 'bingeSessionCount', 'viewingConsistencyScore',
    'peakActivityWindow', 'weekendVsWeekdayRatio', 'monthlyGrowthRate',
    'quarterlyGrowthRate', 'longFormContentRatio', 'educationalContentRatio'
  ]
  
  let allFieldsPresent = true
  for (const field of requiredFields) {
    if (!(field in advancedKPIs)) {
      addResult('DataProcessing', `Required field ${field}`, false, `Missing field`, 'critical')
      allFieldsPresent = false
    }
  }
  
  if (allFieldsPresent) {
    addResult('DataProcessing', 'All required AdvancedKPIs fields present', true, undefined, 'low')
  }
  
  // Data type and range validations
  const totalVideosValid = validateNonNegative(advancedKPIs.totalVideos, 'totalVideos')
  addResult('DataProcessing', 'totalVideos validation', totalVideosValid.valid, totalVideosValid.issue, 'high')
  
  const channelsValid = validateNonNegative(advancedKPIs.uniqueChannels, 'uniqueChannels')
  addResult('DataProcessing', 'uniqueChannels validation', channelsValid.valid, channelsValid.issue, 'high')
  
  // Percentage fields validation
  const repeatRateValid = validateRange(advancedKPIs.repeatChannelRate, 0, 100, 'repeatChannelRate')
  addResult('DataProcessing', 'repeatChannelRate range', repeatRateValid.valid, repeatRateValid.issue, 'medium')
  
  // Peak activity window validation  
  const peakValid = advancedKPIs.peakActivityWindow.start >= 0 && 
                    advancedKPIs.peakActivityWindow.start <= 23 &&
                    advancedKPIs.peakActivityWindow.end >= 0 && 
                    advancedKPIs.peakActivityWindow.end <= 23
  addResult('DataProcessing', 'peakActivityWindow hours valid', peakValid, 
    !peakValid ? `Invalid hours: start=${advancedKPIs.peakActivityWindow.start}, end=${advancedKPIs.peakActivityWindow.end}` : undefined, 'medium')

} catch (error) {
  addResult('DataProcessing', 'computeAdvancedKPIs execution', false, (error as Error).message, 'critical')
}

// TEST SUITE 2: Mathematical Accuracy
console.log('\n🧮 Testing Mathematical Accuracy...')

try {
  const sessionAnalysis = computeSessionAnalysis(records)
  
  // Session metrics validation
  const sessionsValid = validateNonNegative(sessionAnalysis.totalSessions, 'totalSessions')
  addResult('Mathematical', 'totalSessions non-negative', sessionsValid.valid, sessionsValid.issue, 'high')
  
  const avgSessionValid = validateNonNegative(sessionAnalysis.avgSessionLength, 'avgSessionLength')
  addResult('Mathematical', 'avgSessionLength non-negative', avgSessionValid.valid, avgSessionValid.issue, 'medium')
  
  // Session subset validation
  const sessionSubsetValid = (sessionAnalysis.bingeSessions + sessionAnalysis.shortSessions) <= sessionAnalysis.totalSessions
  addResult('Mathematical', 'Session subset logic', sessionSubsetValid,
    !sessionSubsetValid ? `Binge(${sessionAnalysis.bingeSessions}) + Short(${sessionAnalysis.shortSessions}) > Total(${sessionAnalysis.totalSessions})` : undefined, 'high')
  
  // Hourly distribution validation
  const hourlySum = sessionAnalysis.sessionsByTimeOfDay.reduce((sum, hour) => sum + hour.count, 0)
  const hourlySumValid = hourlySum === sessionAnalysis.totalSessions
  addResult('Mathematical', 'Hourly sessions sum consistency', hourlySumValid,
    !hourlySumValid ? `Hourly sum: ${hourlySum}, Total sessions: ${sessionAnalysis.totalSessions}` : undefined, 'high')

} catch (error) {
  addResult('Mathematical', 'Session analysis mathematics', false, (error as Error).message, 'critical')
}

// TEST SUITE 3: Session Detection Algorithm
console.log('\n🔗 Testing Session Detection Algorithm...')

// Create controlled test data for session detection
const testSessionData: WatchRecord[] = [
  {
    id: '1', 
    watchedAt: '2024-08-01T10:00:00Z',
    videoTitle: 'Video 1',
    videoId: 'v1',
    videoUrl: 'https://youtube.com/watch?v=v1',
    channelTitle: 'Test Channel',
    channelUrl: 'https://youtube.com/@testchannel',
    product: 'YouTube',
    topics: ['tech'],
    year: 2024, month: 8, week: 1, dayOfWeek: 4, hour: 10, yoyKey: '2024-08'
  },
  {
    id: '2', 
    watchedAt: '2024-08-01T10:30:00Z', // +30 min
    videoTitle: 'Video 2',
    videoId: 'v2',
    videoUrl: 'https://youtube.com/watch?v=v2',
    channelTitle: 'Test Channel',
    channelUrl: 'https://youtube.com/@testchannel',
    product: 'YouTube', 
    topics: ['tech'],
    year: 2024, month: 8, week: 1, dayOfWeek: 4, hour: 10, yoyKey: '2024-08'
  },
  {
    id: '3', 
    watchedAt: '2024-08-01T11:00:00Z', // +1 hour (still same session)
    videoTitle: 'Video 3',
    videoId: 'v3',
    videoUrl: 'https://youtube.com/watch?v=v3',
    channelTitle: 'Test Channel',
    channelUrl: 'https://youtube.com/@testchannel',
    product: 'YouTube',
    topics: ['tech'],
    year: 2024, month: 8, week: 1, dayOfWeek: 4, hour: 11, yoyKey: '2024-08'
  },
  {
    id: '4', 
    watchedAt: '2024-08-01T14:00:00Z', // +3 hours (new session)
    videoTitle: 'Video 4',
    videoId: 'v4',
    videoUrl: 'https://youtube.com/watch?v=v4',
    channelTitle: 'Test Channel',
    channelUrl: 'https://youtube.com/@testchannel',
    product: 'YouTube',
    topics: ['tech'],
    year: 2024, month: 8, week: 1, dayOfWeek: 4, hour: 14, yoyKey: '2024-08'
  }
]

try {
  const sessionAnalysis = computeSessionAnalysis(testSessionData)
  
  // Should detect exactly 2 sessions (videos 1-3 and video 4)
  const correctSessionCount = sessionAnalysis.totalSessions === 2
  addResult('SessionDetection', 'Correct session count detection', correctSessionCount,
    !correctSessionCount ? `Expected: 2, Got: ${sessionAnalysis.totalSessions}` : undefined, 'high')
  
  // Average should be (3 + 1) / 2 = 2 videos per session  
  const expectedAvgLength = 2
  const avgLengthCorrect = Math.abs(sessionAnalysis.avgSessionLength - expectedAvgLength) < 0.01
  addResult('SessionDetection', 'Average session length calculation', avgLengthCorrect,
    !avgLengthCorrect ? `Expected: ${expectedAvgLength}, Got: ${sessionAnalysis.avgSessionLength}` : undefined, 'medium')

} catch (error) {
  addResult('SessionDetection', 'Session detection algorithm', false, (error as Error).message, 'critical')
}

// TEST SUITE 4: Data Flow Integration  
console.log('\n🔄 Testing Data Flow Integration...')

try {
  // Test consistency between new and existing aggregation functions
  const existingKPIs = computeKPIMetrics(records, { timeframe: 'All', product: 'All', topics: [], channels: [] })
  const advancedKPIs = computeAdvancedKPIs(records)
  
  // Total videos should match between systems
  const videoCountMatch = existingKPIs.totalVideos === advancedKPIs.totalVideos
  addResult('Integration', 'Video count consistency across systems', videoCountMatch,
    !videoCountMatch ? `Existing: ${existingKPIs.totalVideos}, Advanced: ${advancedKPIs.totalVideos}` : undefined, 'high')
  
  // Unique channels should match
  const channelCountMatch = existingKPIs.uniqueChannels === advancedKPIs.uniqueChannels
  addResult('Integration', 'Channel count consistency across systems', channelCountMatch,
    !channelCountMatch ? `Existing: ${existingKPIs.uniqueChannels}, Advanced: ${advancedKPIs.uniqueChannels}` : undefined, 'high')

} catch (error) {
  addResult('Integration', 'Cross-system consistency check', false, (error as Error).message, 'critical')
}

// Time series data validation
try {
  const timeSeriesData = computeTimeSeriesData(records, 'videos', 'daily')
  
  const hasDataPoints = timeSeriesData.length > 0
  addResult('Integration', 'Time series data generation', hasDataPoints,
    !hasDataPoints ? 'No data points generated' : undefined, 'medium')
  
  if (timeSeriesData.length > 0) {
    const firstPoint = timeSeriesData[0]
    const hasRequiredFields = 'date' in firstPoint && 'value' in firstPoint
    addResult('Integration', 'Time series data structure', hasRequiredFields,
      !hasRequiredFields ? `Missing fields in: ${JSON.stringify(firstPoint)}` : undefined, 'medium')
  }

} catch (error) {
  addResult('Integration', 'Time series data generation', false, (error as Error).message, 'medium')
}

// TEST SUITE 5: Edge Case Handling
console.log('\n⚠️ Testing Edge Case Handling...')

// Empty dataset handling
try {
  const emptyKPIs = computeAdvancedKPIs([])
  const emptySessionAnalysis = computeSessionAnalysis([])
  
  const emptyKPIsValid = emptyKPIs.totalVideos === 0 && emptyKPIs.uniqueChannels === 0
  addResult('EdgeCases', 'Empty dataset handling (KPIs)', emptyKPIsValid, undefined, 'medium')
  
  const emptySessionsValid = emptySessionAnalysis.totalSessions === 0
  addResult('EdgeCases', 'Empty dataset handling (Sessions)', emptySessionsValid, undefined, 'medium')

} catch (error) {
  addResult('EdgeCases', 'Empty dataset handling', false, (error as Error).message, 'medium')
}

// Records with null timestamps
try {
  const corruptedRecords: WatchRecord[] = [
    { id: '1', watchedAt: null, videoTitle: 'Test', videoId: null, videoUrl: null, channelTitle: 'Test', channelUrl: null, product: 'YouTube', topics: [], year: null, month: null, week: null, dayOfWeek: null, hour: null, yoyKey: null },
    { id: '2', watchedAt: '2024-08-01T10:00:00Z', videoTitle: 'Test', videoId: 'v2', videoUrl: null, channelTitle: 'Test', channelUrl: null, product: 'YouTube', topics: [], year: 2024, month: 8, week: 1, dayOfWeek: 4, hour: 10, yoyKey: '2024-08' }
  ]
  
  const nullTimestampKPIs = computeAdvancedKPIs(corruptedRecords)
  
  // Should only count records with valid timestamps (1 out of 2)
  const nullHandlingValid = nullTimestampKPIs.totalVideos === 1
  addResult('EdgeCases', 'Null timestamp filtering', nullHandlingValid,
    !nullHandlingValid ? `Expected 1 video, got ${nullTimestampKPIs.totalVideos}` : undefined, 'medium')

} catch (error) {
  addResult('EdgeCases', 'Null timestamp handling', false, (error as Error).message, 'medium')
}

// VALIDATION SUMMARY
console.log('\n📊 VALIDATION SUMMARY')
console.log('=' + '='.repeat(60))

const categories = [...new Set(results.map(r => r.category))]
let totalPassed = 0
let totalFailed = 0
const criticalIssues: string[] = []

categories.forEach(category => {
  const categoryResults = results.filter(r => r.category === category)
  const passed = categoryResults.filter(r => r.passed).length
  const failed = categoryResults.filter(r => !r.passed).length
  
  totalPassed += passed
  totalFailed += failed
  
  console.log(`\n${category}:`)
  console.log(`  ✅ Passed: ${passed}`)
  console.log(`  ❌ Failed: ${failed}`)
  
  const categoryIssues = categoryResults.filter(r => !r.passed)
  if (categoryIssues.length > 0) {
    console.log(`  🔸 Issues:`)
    categoryIssues.forEach(issue => {
      console.log(`    - ${issue.test}: ${issue.issue || 'Failed'}`)
      if (issue.severity === 'critical') {
        criticalIssues.push(`${category}: ${issue.test}`)
      }
    })
  }
})

const successRate = totalPassed + totalFailed > 0 ? (totalPassed / (totalPassed + totalFailed)) * 100 : 0

console.log(`\nOVERALL RESULTS:`)
console.log(`✅ Passed: ${totalPassed}`)
console.log(`❌ Failed: ${totalFailed}`)
console.log(`📈 Success Rate: ${successRate.toFixed(1)}%`)

if (criticalIssues.length > 0) {
  console.log('\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:')
  criticalIssues.forEach(issue => console.log(`  - ${issue}`))
}

// Data integrity assessment
if (successRate === 100) {
  console.log('\n🎉 VALIDATION PASSED: All data integrity checks successful')
} else if (successRate >= 90) {
  console.log('\n✅ VALIDATION MOSTLY PASSED: Minor issues detected, review recommended')
} else if (successRate >= 70) {
  console.log('\n⚠️ VALIDATION PARTIALLY PASSED: Several issues detected, fixes required')  
} else {
  console.log('\n🚨 VALIDATION FAILED: Major issues detected, immediate attention required')
}

// Export results for further analysis
export { results }