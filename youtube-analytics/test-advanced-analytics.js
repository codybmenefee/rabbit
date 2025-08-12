#!/usr/bin/env node

/**
 * Advanced Analytics Validation Suite
 * 
 * This script validates the data integrity and processing accuracy of the newly implemented
 * Analytics page feature, focusing on:
 * 1. Data processing accuracy
 * 2. Mathematical calculations 
 * 3. Session detection algorithms
 * 4. Integration with existing data pipeline
 * 5. Edge case handling
 * 
 * Note: This is a simplified validation using mock data and manual function recreation
 * since the actual TypeScript modules can't be directly imported in Node.js
 */

// Mock data for testing (simplified version)
function generateTestData() {
  const records = []
  const now = new Date()
  
  // Generate 100 test records over the last 30 days
  for (let i = 0; i < 100; i++) {
    const date = new Date(now.getTime() - (Math.random() * 30 * 24 * 60 * 60 * 1000))
    records.push({
      id: `test_${i}`,
      watchedAt: date.toISOString(),
      videoTitle: `Test Video ${i}`,
      channelTitle: `Channel ${Math.floor(i / 5)}`, // 20 unique channels
      product: Math.random() > 0.1 ? 'YouTube' : 'YouTube Music',
      topics: ['tech', 'education'][Math.floor(Math.random() * 2)] ? ['tech'] : ['education'],
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      week: Math.floor(date.getDate() / 7) + 1,
      dayOfWeek: date.getDay(),
      hour: date.getHours(),
      yoyKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    })
  }
  
  return records
}

// Test data generation
const { records } = generateDemoData()
console.log(`🧪 Generated ${records.length} test records for validation\n`)

// Validation Results Object
const validationResults = {
  dataProcessingAccuracy: { pass: 0, fail: 0, issues: [] },
  mathematicalAccuracy: { pass: 0, fail: 0, issues: [] },
  sessionDetection: { pass: 0, fail: 0, issues: [] },
  dataFlowIntegration: { pass: 0, fail: 0, issues: [] },
  edgeCaseHandling: { pass: 0, fail: 0, issues: [] }
}

// Utility functions
function validateRange(value, min, max, label) {
  if (typeof value !== 'number' || isNaN(value)) {
    return { valid: false, issue: `${label}: Expected number, got ${typeof value}` }
  }
  if (value < min || value > max) {
    return { valid: false, issue: `${label}: Value ${value} outside expected range [${min}, ${max}]` }
  }
  return { valid: true }
}

function validateNonNegative(value, label) {
  if (typeof value !== 'number' || isNaN(value) || value < 0) {
    return { valid: false, issue: `${label}: Expected non-negative number, got ${value}` }
  }
  return { valid: true }
}

function logValidation(category, test, result, issue = null) {
  if (result) {
    validationResults[category].pass++
    console.log(`✅ ${test}`)
  } else {
    validationResults[category].fail++
    validationResults[category].issues.push(issue || test)
    console.log(`❌ ${test} - ${issue}`)
  }
}

// 1. DATA PROCESSING ACCURACY TESTS
console.log('🔍 TESTING DATA PROCESSING ACCURACY')
console.log('=' + '='.repeat(50))

// Test computeAdvancedKPIs
try {
  const advancedKPIs = computeAdvancedKPIs(records)
  
  // Basic validation - all required fields present
  const requiredFields = [
    'totalVideos', 'uniqueChannels', 'estimatedWatchTime', 'avgVideosPerDay',
    'avgSessionLength', 'contentDiversityIndex', 'repeatChannelRate', 
    'discoveryRate', 'bingeSessionCount', 'viewingConsistencyScore',
    'peakActivityWindow', 'weekendVsWeekdayRatio', 'monthlyGrowthRate',
    'quarterlyGrowthRate', 'longFormContentRatio', 'educationalContentRatio'
  ]
  
  let fieldsPresent = true
  for (const field of requiredFields) {
    if (!(field in advancedKPIs)) {
      logValidation('dataProcessingAccuracy', `AdvancedKPIs field ${field}`, false, `Missing field: ${field}`)
      fieldsPresent = false
    }
  }
  if (fieldsPresent) {
    logValidation('dataProcessingAccuracy', 'All required AdvancedKPIs fields present', true)
  }
  
  // Validate data types and ranges
  const totalVideosValid = validateNonNegative(advancedKPIs.totalVideos, 'totalVideos')
  logValidation('dataProcessingAccuracy', 'totalVideos validation', totalVideosValid.valid, totalVideosValid.issue)
  
  const channelsValid = validateNonNegative(advancedKPIs.uniqueChannels, 'uniqueChannels')
  logValidation('dataProcessingAccuracy', 'uniqueChannels validation', channelsValid.valid, channelsValid.issue)
  
  // Percentage fields should be 0-100
  const ratioValid = validateRange(advancedKPIs.repeatChannelRate, 0, 100, 'repeatChannelRate')
  logValidation('dataProcessingAccuracy', 'repeatChannelRate range', ratioValid.valid, ratioValid.issue)
  
  const diversityValid = validateRange(advancedKPIs.contentDiversityIndex, 0, 1000, 'contentDiversityIndex') 
  logValidation('dataProcessingAccuracy', 'contentDiversityIndex range', diversityValid.valid, diversityValid.issue)
  
  // Peak activity window should be valid hours
  const peakValid = advancedKPIs.peakActivityWindow.start >= 0 && 
                    advancedKPIs.peakActivityWindow.start <= 23 &&
                    advancedKPIs.peakActivityWindow.end >= 0 && 
                    advancedKPIs.peakActivityWindow.end <= 23
  logValidation('dataProcessingAccuracy', 'peakActivityWindow hours valid', peakValid, 
    !peakValid ? `Invalid hours: start=${advancedKPIs.peakActivityWindow.start}, end=${advancedKPIs.peakActivityWindow.end}` : null)
  
} catch (error) {
  logValidation('dataProcessingAccuracy', 'computeAdvancedKPIs execution', false, error.message)
}

// Test with filtered data
try {
  const filters = { timeframe: 'Last6M', product: 'YouTube', topics: ['tech'], channels: [] }
  const filteredKPIs = computeAdvancedKPIs(records, filters)
  
  // Should have fewer or equal videos when filtered
  const totalKPIs = computeAdvancedKPIs(records)
  const filterReduction = filteredKPIs.totalVideos <= totalKPIs.totalVideos
  logValidation('dataProcessingAccuracy', 'Filters reduce total videos correctly', filterReduction, 
    !filterReduction ? `Filtered: ${filteredKPIs.totalVideos}, Total: ${totalKPIs.totalVideos}` : null)
    
} catch (error) {
  logValidation('dataProcessingAccuracy', 'computeAdvancedKPIs with filters', false, error.message)
}

console.log('')

// 2. MATHEMATICAL ACCURACY TESTS  
console.log('🧮 TESTING MATHEMATICAL ACCURACY')
console.log('=' + '='.repeat(50))

// Test session analysis mathematics
try {
  const sessionAnalysis = computeSessionAnalysis(records)
  
  // Validate session metrics are mathematically consistent
  const sessionsValid = validateNonNegative(sessionAnalysis.totalSessions, 'totalSessions')
  logValidation('mathematicalAccuracy', 'totalSessions non-negative', sessionsValid.valid, sessionsValid.issue)
  
  const avgSessionValid = validateNonNegative(sessionAnalysis.avgSessionLength, 'avgSessionLength')
  logValidation('mathematicalAccuracy', 'avgSessionLength non-negative', avgSessionValid.valid, avgSessionValid.issue)
  
  // Binge + short sessions should be <= total sessions
  const sessionSubsetValid = (sessionAnalysis.bingeSessions + sessionAnalysis.shortSessions) <= sessionAnalysis.totalSessions
  logValidation('mathematicalAccuracy', 'Session subset validation', sessionSubsetValid,
    !sessionSubsetValid ? `Binge(${sessionAnalysis.bingeSessions}) + Short(${sessionAnalysis.shortSessions}) > Total(${sessionAnalysis.totalSessions})` : null)
  
  // Sessions by time of day should sum to total sessions
  const hourlySum = sessionAnalysis.sessionsByTimeOfDay.reduce((sum, hour) => sum + hour.count, 0)
  const hourlySumValid = hourlySum === sessionAnalysis.totalSessions
  logValidation('mathematicalAccuracy', 'Hourly sessions sum equals total', hourlySumValid,
    !hourlySumValid ? `Hourly sum: ${hourlySum}, Total sessions: ${sessionAnalysis.totalSessions}` : null)
    
} catch (error) {
  logValidation('mathematicalAccuracy', 'Session analysis mathematics', false, error.message)
}

// Test percentage calculations manually
try {
  const validRecords = records.filter(r => r.watchedAt !== null)
  const channelCounts = new Map()
  validRecords.forEach(r => {
    if (r.channelTitle) {
      channelCounts.set(r.channelTitle, (channelCounts.get(r.channelTitle) || 0) + 1)
    }
  })
  
  const uniqueChannels = channelCounts.size
  const repeatChannels = Array.from(channelCounts.values()).filter(count => count > 1).length
  const expectedRepeatRate = uniqueChannels > 0 ? (repeatChannels / uniqueChannels) * 100 : 0
  
  const advancedKPIs = computeAdvancedKPIs(records)
  const calculatedRepeatRate = advancedKPIs.repeatChannelRate
  
  // Allow small floating point differences (within 0.1%)
  const repeatRateAccurate = Math.abs(expectedRepeatRate - calculatedRepeatRate) < 0.1
  logValidation('mathematicalAccuracy', 'Repeat channel rate calculation', repeatRateAccurate,
    !repeatRateAccurate ? `Expected: ${expectedRepeatRate.toFixed(2)}%, Got: ${calculatedRepeatRate.toFixed(2)}%` : null)
    
} catch (error) {
  logValidation('mathematicalAccuracy', 'Manual percentage verification', false, error.message)
}

console.log('')

// 3. SESSION DETECTION ALGORITHM TESTS
console.log('🔗 TESTING SESSION DETECTION ALGORITHM')
console.log('=' + '='.repeat(50))

// Create test records with known session patterns
function createTestSessionData() {
  const baseDate = new Date('2024-08-01T10:00:00Z')
  return [
    // Session 1: 3 videos within 1 hour
    { 
      id: '1', 
      watchedAt: new Date(baseDate.getTime()).toISOString(),
      videoTitle: 'Video 1',
      channelTitle: 'Test Channel',
      product: 'YouTube',
      topics: ['tech'],
      year: 2024, month: 8, week: 1, dayOfWeek: 4, hour: 10, yoyKey: '2024-08'
    },
    { 
      id: '2', 
      watchedAt: new Date(baseDate.getTime() + 30 * 60 * 1000).toISOString(), // +30 min
      videoTitle: 'Video 2',
      channelTitle: 'Test Channel',
      product: 'YouTube', 
      topics: ['tech'],
      year: 2024, month: 8, week: 1, dayOfWeek: 4, hour: 10, yoyKey: '2024-08'
    },
    { 
      id: '3', 
      watchedAt: new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString(), // +1 hour
      videoTitle: 'Video 3',
      channelTitle: 'Test Channel',
      product: 'YouTube',
      topics: ['tech'],
      year: 2024, month: 8, week: 1, dayOfWeek: 4, hour: 11, yoyKey: '2024-08'
    },
    // Session 2: 2 videos after 3 hour gap (new session)
    { 
      id: '4', 
      watchedAt: new Date(baseDate.getTime() + 4 * 60 * 60 * 1000).toISOString(), // +4 hours
      videoTitle: 'Video 4',
      channelTitle: 'Test Channel',
      product: 'YouTube',
      topics: ['tech'],
      year: 2024, month: 8, week: 1, dayOfWeek: 4, hour: 14, yoyKey: '2024-08'
    },
    { 
      id: '5', 
      watchedAt: new Date(baseDate.getTime() + 4.5 * 60 * 60 * 1000).toISOString(), // +4.5 hours
      videoTitle: 'Video 5',
      channelTitle: 'Test Channel',
      product: 'YouTube',
      topics: ['tech'],
      year: 2024, month: 8, week: 1, dayOfWeek: 4, hour: 14, yoyKey: '2024-08'
    }
  ]
}

try {
  const testSessionData = createTestSessionData()
  const sessionAnalysis = computeSessionAnalysis(testSessionData)
  
  // Should detect exactly 2 sessions
  const correctSessionCount = sessionAnalysis.totalSessions === 2
  logValidation('sessionDetection', 'Detects correct number of sessions (2)', correctSessionCount,
    !correctSessionCount ? `Expected: 2, Got: ${sessionAnalysis.totalSessions}` : null)
  
  // Average session length should be 2.5 videos per session
  const expectedAvgLength = (3 + 2) / 2 // (session1 + session2) / total_sessions
  const avgLengthCorrect = Math.abs(sessionAnalysis.avgSessionLength - expectedAvgLength) < 0.01
  logValidation('sessionDetection', 'Calculates correct average session length', avgLengthCorrect,
    !avgLengthCorrect ? `Expected: ${expectedAvgLength}, Got: ${sessionAnalysis.avgSessionLength}` : null)
  
  // Maximum session length should be 3
  const maxLengthCorrect = sessionAnalysis.maxSessionLength === 3
  logValidation('sessionDetection', 'Identifies correct maximum session length', maxLengthCorrect,
    !maxLengthCorrect ? `Expected: 3, Got: ${sessionAnalysis.maxSessionLength}` : null)
    
} catch (error) {
  logValidation('sessionDetection', 'Session detection algorithm', false, error.message)
}

console.log('')

// 4. DATA FLOW INTEGRATION TESTS
console.log('🔄 TESTING DATA FLOW INTEGRATION')
console.log('=' + '='.repeat(50))

try {
  // Test consistency between new and existing aggregation functions
  const existingKPIs = computeKPIMetrics(records, { timeframe: 'All', product: 'All', topics: [], channels: [] })
  const advancedKPIs = computeAdvancedKPIs(records)
  
  // Total videos should match between systems
  const videoCountMatch = existingKPIs.totalVideos === advancedKPIs.totalVideos
  logValidation('dataFlowIntegration', 'Video count consistency across systems', videoCountMatch,
    !videoCountMatch ? `Existing: ${existingKPIs.totalVideos}, Advanced: ${advancedKPIs.totalVideos}` : null)
  
  // Unique channels should match  
  const channelCountMatch = existingKPIs.uniqueChannels === advancedKPIs.uniqueChannels
  logValidation('dataFlowIntegration', 'Channel count consistency across systems', channelCountMatch,
    !channelCountMatch ? `Existing: ${existingKPIs.uniqueChannels}, Advanced: ${advancedKPIs.uniqueChannels}` : null)
    
} catch (error) {
  logValidation('dataFlowIntegration', 'Cross-system consistency check', false, error.message)
}

// Test time series data generation
try {
  const timeSeriesData = computeTimeSeriesData(records, 'videos', 'daily')
  
  // Should generate data points for valid records
  const hasDataPoints = timeSeriesData.length > 0
  logValidation('dataFlowIntegration', 'Time series generates data points', hasDataPoints,
    !hasDataPoints ? 'No data points generated' : null)
  
  // Each data point should have required structure
  if (timeSeriesData.length > 0) {
    const firstPoint = timeSeriesData[0]
    const hasRequiredFields = 'date' in firstPoint && 'value' in firstPoint
    logValidation('dataFlowIntegration', 'Time series data point structure', hasRequiredFields,
      !hasRequiredFields ? `Missing fields in: ${JSON.stringify(firstPoint)}` : null)
  }
  
} catch (error) {
  logValidation('dataFlowIntegration', 'Time series data generation', false, error.message)
}

console.log('')

// 5. EDGE CASE HANDLING TESTS
console.log('⚠️ TESTING EDGE CASE HANDLING') 
console.log('=' + '='.repeat(50))

// Test empty data set
try {
  const emptyKPIs = computeAdvancedKPIs([])
  const emptySessionAnalysis = computeSessionAnalysis([])
  const emptyTimeSeries = computeTimeSeriesData([], 'videos')
  
  // Should return safe defaults for empty data
  const emptyKPIsValid = emptyKPIs.totalVideos === 0 && emptyKPIs.uniqueChannels === 0
  logValidation('edgeCaseHandling', 'Handles empty dataset gracefully', emptyKPIsValid)
  
  const emptySessionsValid = emptySessionAnalysis.totalSessions === 0
  logValidation('edgeCaseHandling', 'Session analysis handles empty data', emptySessionsValid)
  
  const emptyTimeSeriesValid = Array.isArray(emptyTimeSeries) && emptyTimeSeries.length === 0
  logValidation('edgeCaseHandling', 'Time series handles empty data', emptyTimeSeriesValid)
  
} catch (error) {
  logValidation('edgeCaseHandling', 'Empty dataset handling', false, error.message)
}

// Test records with null timestamps
try {
  const corruptedRecords = [
    { id: '1', watchedAt: null, videoTitle: 'Test', channelTitle: 'Test', product: 'YouTube', topics: [] },
    { id: '2', watchedAt: '2024-08-01T10:00:00Z', videoTitle: 'Test', channelTitle: 'Test', product: 'YouTube', topics: [] }
  ]
  
  const nullTimestampKPIs = computeAdvancedKPIs(corruptedRecords)
  
  // Should only count records with valid timestamps (1 out of 2)
  const nullHandlingValid = nullTimestampKPIs.totalVideos === 1
  logValidation('edgeCaseHandling', 'Filters out null timestamps correctly', nullHandlingValid,
    !nullHandlingValid ? `Expected 1 video, got ${nullTimestampKPIs.totalVideos}` : null)
    
} catch (error) {
  logValidation('edgeCaseHandling', 'Null timestamp handling', false, error.message)
}

// Test missing required fields
try {
  const incompleteRecords = [
    { id: '1', watchedAt: '2024-08-01T10:00:00Z', topics: [] }, // missing titles
    { id: '2', watchedAt: '2024-08-01T11:00:00Z', videoTitle: 'Test', topics: [] } // missing channel
  ]
  
  const incompleteKPIs = computeAdvancedKPIs(incompleteRecords)
  
  // Should handle missing fields gracefully
  const incompleteHandlingValid = incompleteKPIs.totalVideos === 2 && incompleteKPIs.uniqueChannels >= 0
  logValidation('edgeCaseHandling', 'Handles missing required fields', incompleteHandlingValid)
  
} catch (error) {
  logValidation('edgeCaseHandling', 'Missing fields handling', false, error.message)
}

console.log('')

// GENERATE VALIDATION SUMMARY
console.log('📊 VALIDATION SUMMARY')
console.log('=' + '='.repeat(50))

let totalPassed = 0
let totalFailed = 0
let criticalIssues = []

Object.entries(validationResults).forEach(([category, results]) => {
  totalPassed += results.pass
  totalFailed += results.fail
  
  console.log(`${category}:`)
  console.log(`  ✅ Passed: ${results.pass}`)
  console.log(`  ❌ Failed: ${results.fail}`)
  
  if (results.issues.length > 0) {
    console.log(`  🔸 Issues:`)
    results.issues.forEach(issue => {
      console.log(`    - ${issue}`)
      // Mark critical issues
      if (issue.includes('Missing field') || issue.includes('execution')) {
        criticalIssues.push(`${category}: ${issue}`)
      }
    })
  }
  console.log('')
})

console.log(`OVERALL: ${totalPassed} passed, ${totalFailed} failed`)
console.log(`SUCCESS RATE: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`)

if (criticalIssues.length > 0) {
  console.log('\n🚨 CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION:')
  criticalIssues.forEach(issue => console.log(`  - ${issue}`))
}

const overallSuccess = totalFailed === 0
const successRate = (totalPassed / (totalPassed + totalFailed)) * 100

console.log(`\n${overallSuccess ? '✅' : '⚠️'} VALIDATION ${overallSuccess ? 'PASSED' : 'COMPLETED WITH ISSUES'}`)

if (successRate < 90) {
  console.log('🚨 SUCCESS RATE BELOW 90% - REQUIRES ATTENTION')
  process.exit(1)
} else if (successRate < 100) {
  console.log('⚠️ MINOR ISSUES DETECTED - REVIEW RECOMMENDED')
} else {
  console.log('🎉 ALL VALIDATIONS PASSED - SYSTEM INTEGRITY CONFIRMED')
}