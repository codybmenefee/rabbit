#!/usr/bin/env tsx

/**
 * Specific YOY Calculation Verification (Fixed Version)
 * 
 * This script creates controlled test scenarios using dynamic dates to verify 
 * the mathematical accuracy of Year-over-Year delta calculations.
 */

import { computeKPIMetrics } from '../lib/aggregations'
import { WatchRecord } from '../types/records'

console.log('🧮 YEAR-OVER-YEAR CALCULATION VERIFICATION (FIXED)')
console.log('='.repeat(60))

const now = new Date()
const currentYear = now.getFullYear()
const previousYear = currentYear - 1

console.log(`Current year: ${currentYear}`)
console.log(`Previous year: ${previousYear}`)
console.log(`Current date: ${now.toISOString()}`)

// Test Scenario 1: Basic YOY growth
function testBasicYOYGrowth() {
  console.log('\n📈 Test 1: Basic YOY Growth (100% increase)')
  
  const testData: WatchRecord[] = [
    // Current year: 10 videos in January
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `current-${i}`,
      watchedAt: `${currentYear}-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      videoId: `video-${i}`,
      videoTitle: `Video ${i}`,
      videoUrl: null,
      channelTitle: `Channel ${i % 3}`,
      channelUrl: null,
      product: 'YouTube' as const,
      topics: ['Test'],
      year: currentYear,
      month: 1,
      week: Math.floor(i / 7) + 1,
      dayOfWeek: i % 7,
      hour: 12,
      yoyKey: `${currentYear}-01`
    })),
    
    // Previous year: 5 videos in January (50% of current)
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `previous-${i}`,
      watchedAt: `${previousYear}-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      videoId: `prev-video-${i}`,
      videoTitle: `Previous Video ${i}`,
      videoUrl: null,
      channelTitle: `Channel ${i % 3}`,
      channelUrl: null,
      product: 'YouTube' as const,
      topics: ['Test'],
      year: previousYear,
      month: 1,
      week: Math.floor(i / 7) + 1,
      dayOfWeek: i % 7,
      hour: 12,
      yoyKey: `${previousYear}-01`
    }))
  ]
  
  const kpi = computeKPIMetrics(testData, { timeframe: 'All', product: 'All' })
  
  // Manual calculation: ((10 - 5) / 5) * 100 = 100%
  const expectedYoyDelta = 100
  const actualYoyDelta = kpi.ytdYoyDelta
  
  console.log(`Current YTD Videos: ${kpi.ytdVideos}`)
  console.log(`Expected YOY Delta: ${expectedYoyDelta}%`)
  console.log(`Actual YOY Delta: ${actualYoyDelta.toFixed(2)}%`)
  console.log(`Match: ${Math.abs(actualYoyDelta - expectedYoyDelta) < 0.01 ? '✅' : '❌'}`)
  
  return Math.abs(actualYoyDelta - expectedYoyDelta) < 0.01
}

// Test Scenario 2: YOY decline
function testYOYDecline() {
  console.log('\n📉 Test 2: YOY Decline (-50% decrease)')
  
  const testData: WatchRecord[] = [
    // Current year: 5 videos
    ...Array.from({ length: 5 }, (_, i) => ({
      id: `current-${i}`,
      watchedAt: `${currentYear}-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      videoId: `video-${i}`,
      videoTitle: `Video ${i}`,
      videoUrl: null,
      channelTitle: `Channel ${i % 3}`,
      channelUrl: null,
      product: 'YouTube' as const,
      topics: ['Test'],
      year: currentYear,
      month: 1,
      week: Math.floor(i / 7) + 1,
      dayOfWeek: i % 7,
      hour: 12,
      yoyKey: `${currentYear}-01`
    })),
    
    // Previous year: 10 videos (double the current)
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `previous-${i}`,
      watchedAt: `${previousYear}-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      videoId: `prev-video-${i}`,
      videoTitle: `Previous Video ${i}`,
      videoUrl: null,
      channelTitle: `Channel ${i % 3}`,
      channelUrl: null,
      product: 'YouTube' as const,
      topics: ['Test'],
      year: previousYear,
      month: 1,
      week: Math.floor(i / 7) + 1,
      dayOfWeek: i % 7,
      hour: 12,
      yoyKey: `${previousYear}-01`
    }))
  ]
  
  const kpi = computeKPIMetrics(testData, { timeframe: 'All', product: 'All' })
  
  // Manual calculation: ((5 - 10) / 10) * 100 = -50%
  const expectedYoyDelta = -50
  const actualYoyDelta = kpi.ytdYoyDelta
  
  console.log(`Current YTD Videos: ${kpi.ytdVideos}`)
  console.log(`Expected YOY Delta: ${expectedYoyDelta}%`)
  console.log(`Actual YOY Delta: ${actualYoyDelta.toFixed(2)}%`)
  console.log(`Match: ${Math.abs(actualYoyDelta - expectedYoyDelta) < 0.01 ? '✅' : '❌'}`)
  
  return Math.abs(actualYoyDelta - expectedYoyDelta) < 0.01
}

// Test Scenario 3: Zero previous year data
function testZeroPreviousYear() {
  console.log('\n🚀 Test 3: Zero Previous Year Data (new growth from zero)')
  
  const testData: WatchRecord[] = [
    // Current year: 8 videos
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `current-${i}`,
      watchedAt: `${currentYear}-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      videoId: `video-${i}`,
      videoTitle: `Video ${i}`,
      videoUrl: null,
      channelTitle: `Channel ${i % 3}`,
      channelUrl: null,
      product: 'YouTube' as const,
      topics: ['Test'],
      year: currentYear,
      month: 1,
      week: Math.floor(i / 7) + 1,
      dayOfWeek: i % 7,
      hour: 12,
      yoyKey: `${currentYear}-01`
    }))
    // No previous year data
  ]
  
  const kpi = computeKPIMetrics(testData, { timeframe: 'All', product: 'All' })
  
  // When previous year is 0, we should get 100% if current > 0, or 0 if current = 0
  const expectedYoyDelta = 100
  const actualYoyDelta = kpi.ytdYoyDelta
  
  console.log(`Current YTD Videos: ${kpi.ytdVideos}`)
  console.log(`Expected YOY Delta: ${expectedYoyDelta}% (100% when growing from zero)`)
  console.log(`Actual YOY Delta: ${actualYoyDelta.toFixed(2)}%`)
  console.log(`Match: ${Math.abs(actualYoyDelta - expectedYoyDelta) < 0.01 ? '✅' : '❌'}`)
  
  return Math.abs(actualYoyDelta - expectedYoyDelta) < 0.01
}

// Test Scenario 4: Same values (no change)
function testNoChange() {
  console.log('\n⚖️ Test 4: No Change (0% delta)')
  
  const testData: WatchRecord[] = [
    // Current year: 7 videos
    ...Array.from({ length: 7 }, (_, i) => ({
      id: `current-${i}`,
      watchedAt: `${currentYear}-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      videoId: `video-${i}`,
      videoTitle: `Video ${i}`,
      videoUrl: null,
      channelTitle: `Channel ${i % 3}`,
      channelUrl: null,
      product: 'YouTube' as const,
      topics: ['Test'],
      year: currentYear,
      month: 1,
      week: Math.floor(i / 7) + 1,
      dayOfWeek: i % 7,
      hour: 12,
      yoyKey: `${currentYear}-01`
    })),
    
    // Previous year: 7 videos (same as current)
    ...Array.from({ length: 7 }, (_, i) => ({
      id: `previous-${i}`,
      watchedAt: `${previousYear}-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      videoId: `prev-video-${i}`,
      videoTitle: `Previous Video ${i}`,
      videoUrl: null,
      channelTitle: `Channel ${i % 3}`,
      channelUrl: null,
      product: 'YouTube' as const,
      topics: ['Test'],
      year: previousYear,
      month: 1,
      week: Math.floor(i / 7) + 1,
      dayOfWeek: i % 7,
      hour: 12,
      yoyKey: `${previousYear}-01`
    }))
  ]
  
  const kpi = computeKPIMetrics(testData, { timeframe: 'All', product: 'All' })
  
  // Manual calculation: ((7 - 7) / 7) * 100 = 0%
  const expectedYoyDelta = 0
  const actualYoyDelta = kpi.ytdYoyDelta
  
  console.log(`Current YTD Videos: ${kpi.ytdVideos}`)
  console.log(`Expected YOY Delta: ${expectedYoyDelta}%`)
  console.log(`Actual YOY Delta: ${actualYoyDelta.toFixed(2)}%`)
  console.log(`Match: ${Math.abs(actualYoyDelta - expectedYoyDelta) < 0.01 ? '✅' : '❌'}`)
  
  return Math.abs(actualYoyDelta - expectedYoyDelta) < 0.01
}

// Test Scenario 5: Fractional calculations
function testFractionalCalculations() {
  console.log('\n🔢 Test 5: Fractional Calculations (33.33% increase)')
  
  const testData: WatchRecord[] = [
    // Current year: 4 videos
    ...Array.from({ length: 4 }, (_, i) => ({
      id: `current-${i}`,
      watchedAt: `${currentYear}-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      videoId: `video-${i}`,
      videoTitle: `Video ${i}`,
      videoUrl: null,
      channelTitle: `Channel ${i % 3}`,
      channelUrl: null,
      product: 'YouTube' as const,
      topics: ['Test'],
      year: currentYear,
      month: 1,
      week: Math.floor(i / 7) + 1,
      dayOfWeek: i % 7,
      hour: 12,
      yoyKey: `${currentYear}-01`
    })),
    
    // Previous year: 3 videos
    ...Array.from({ length: 3 }, (_, i) => ({
      id: `previous-${i}`,
      watchedAt: `${previousYear}-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
      videoId: `prev-video-${i}`,
      videoTitle: `Previous Video ${i}`,
      videoUrl: null,
      channelTitle: `Channel ${i % 3}`,
      channelUrl: null,
      product: 'YouTube' as const,
      topics: ['Test'],
      year: previousYear,
      month: 1,
      week: Math.floor(i / 7) + 1,
      dayOfWeek: i % 7,
      hour: 12,
      yoyKey: `${previousYear}-01`
    }))
  ]
  
  const kpi = computeKPIMetrics(testData, { timeframe: 'All', product: 'All' })
  
  // Manual calculation: ((4 - 3) / 3) * 100 = 33.333...%
  const expectedYoyDelta = 33.333333333333336
  const actualYoyDelta = kpi.ytdYoyDelta
  
  console.log(`Current YTD Videos: ${kpi.ytdVideos}`)
  console.log(`Expected YOY Delta: ${expectedYoyDelta.toFixed(6)}%`)
  console.log(`Actual YOY Delta: ${actualYoyDelta.toFixed(6)}%`)
  console.log(`Match: ${Math.abs(actualYoyDelta - expectedYoyDelta) < 0.000001 ? '✅' : '❌'}`)
  
  return Math.abs(actualYoyDelta - expectedYoyDelta) < 0.000001
}

// Run all tests
async function main() {
  const tests = [
    testBasicYOYGrowth,
    testYOYDecline,
    testZeroPreviousYear,
    testNoChange,
    testFractionalCalculations
  ]
  
  let passedTests = 0
  const totalTests = tests.length
  
  for (const test of tests) {
    if (test()) {
      passedTests++
    }
  }
  
  console.log('\n' + '='.repeat(60))
  console.log(`🎯 YOY CALCULATION VERIFICATION SUMMARY`)
  console.log(`Tests Passed: ${passedTests}/${totalTests}`)
  console.log(`Overall Status: ${passedTests === totalTests ? '✅ PASS' : '❌ FAIL'}`)
  console.log('='.repeat(60))
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All YOY calculations are mathematically correct!')
  } else {
    console.log(`\n❌ ${totalTests - passedTests} YOY calculation tests failed.`)
  }
  
  process.exit(passedTests === totalTests ? 0 : 1)
}

main()