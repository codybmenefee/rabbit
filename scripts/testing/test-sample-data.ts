#!/usr/bin/env tsx

/**
 * Sample Data Generation Validation
 * 
 * Validates that the generateSampleData function produces realistic,
 * well-distributed test data suitable for dashboard demonstration.
 */

import { generateSampleData } from '../components/dashboard/main-dashboard'
import { parseISO, isValid, differenceInDays } from 'date-fns'

console.log('📊 SAMPLE DATA GENERATION VALIDATION')
console.log('='.repeat(60))

const sampleData = generateSampleData()

console.log(`Generated ${sampleData.length} sample records`)

// Test 1: All records have required fields
let requiredFieldsTest = true
let missingFieldsCount = 0

sampleData.forEach((record, index) => {
  const requiredFields = ['id', 'watchedAt', 'videoTitle', 'channelTitle', 'product', 'topics']
  const missingFields = requiredFields.filter(field => !record[field as keyof typeof record])
  
  if (missingFields.length > 0) {
    requiredFieldsTest = false
    missingFieldsCount++
    if (missingFieldsCount <= 5) { // Show only first 5 errors
      console.log(`Record ${index}: Missing fields: ${missingFields.join(', ')}`)
    }
  }
})

console.log(`\n✅ Required Fields Test: ${requiredFieldsTest ? 'PASS' : 'FAIL'}`)
if (!requiredFieldsTest) {
  console.log(`   ${missingFieldsCount} records missing required fields`)
}

// Test 2: Date range validation
const dates = sampleData
  .map(r => r.watchedAt)
  .filter(Boolean)
  .map(d => parseISO(d!))
  .filter(isValid)

const minDate = new Date(Math.min(...dates.map(d => d.getTime())))
const maxDate = new Date(Math.max(...dates.map(d => d.getTime())))
const dateSpan = differenceInDays(maxDate, minDate)

console.log(`\n📅 Date Range Analysis:`)
console.log(`   Start: ${minDate.toISOString()}`)
console.log(`   End: ${maxDate.toISOString()}`)
console.log(`   Span: ${dateSpan} days`)
console.log(`   Valid dates: ${dates.length}/${sampleData.length}`)

const dateRangeTest = dateSpan > 365 && dates.length === sampleData.length
console.log(`✅ Date Range Test: ${dateRangeTest ? 'PASS' : 'FAIL'}`)

// Test 3: Data distribution analysis
const channelCounts = new Map<string, number>()
const topicCounts = new Map<string, number>()
const productCounts = new Map<string, number>()

sampleData.forEach(record => {
  if (record.channelTitle) {
    channelCounts.set(record.channelTitle, (channelCounts.get(record.channelTitle) || 0) + 1)
  }
  
  record.topics.forEach(topic => {
    topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
  })
  
  productCounts.set(record.product, (productCounts.get(record.product) || 0) + 1)
})

console.log(`\n📈 Distribution Analysis:`)
console.log(`   Unique channels: ${channelCounts.size}`)
console.log(`   Unique topics: ${topicCounts.size}`)
console.log(`   Products: ${Array.from(productCounts.entries()).map(([k,v]) => `${k}:${v}`).join(', ')}`)

// Test reasonable distribution
const distributionTest = channelCounts.size >= 3 && 
                        topicCounts.size >= 3 && 
                        productCounts.has('YouTube') && 
                        (productCounts.get('YouTube Music') || 0) > 0

console.log(`✅ Distribution Test: ${distributionTest ? 'PASS' : 'FAIL'}`)

// Test 4: Time component consistency
let timeConsistencyTest = true
let timeInconsistencies = 0

sampleData.forEach((record, index) => {
  if (record.watchedAt) {
    const date = parseISO(record.watchedAt)
    const expectedYear = date.getFullYear()
    const expectedMonth = date.getMonth() + 1
    const expectedHour = date.getHours()
    const expectedDay = date.getDay()
    
    if (record.year !== expectedYear ||
        record.month !== expectedMonth ||
        record.hour !== expectedHour ||
        record.dayOfWeek !== expectedDay) {
      timeConsistencyTest = false
      timeInconsistencies++
      if (timeInconsistencies <= 3) {
        console.log(`Record ${index}: Time component mismatch`)
        console.log(`   Date: ${record.watchedAt}`)
        console.log(`   Expected: year=${expectedYear}, month=${expectedMonth}, hour=${expectedHour}, day=${expectedDay}`)
        console.log(`   Actual: year=${record.year}, month=${record.month}, hour=${record.hour}, day=${record.dayOfWeek}`)
      }
    }
  }
})

console.log(`\n✅ Time Consistency Test: ${timeConsistencyTest ? 'PASS' : 'FAIL'}`)
if (!timeConsistencyTest) {
  console.log(`   ${timeInconsistencies} records with time inconsistencies`)
}

// Test 5: Unique ID generation
const uniqueIds = new Set(sampleData.map(r => r.id))
const uniqueIdTest = uniqueIds.size === sampleData.length

console.log(`\n✅ Unique ID Test: ${uniqueIdTest ? 'PASS' : 'FAIL'}`)
if (!uniqueIdTest) {
  console.log(`   ${sampleData.length - uniqueIds.size} duplicate IDs found`)
}

// Summary
const allTests = [
  requiredFieldsTest,
  dateRangeTest,
  distributionTest,
  timeConsistencyTest,
  uniqueIdTest
]

const passedTests = allTests.filter(Boolean).length
const totalTests = allTests.length

console.log('\n' + '='.repeat(60))
console.log('🎯 SAMPLE DATA VALIDATION SUMMARY')
console.log(`Tests Passed: ${passedTests}/${totalTests}`)
console.log(`Overall Status: ${passedTests === totalTests ? '✅ PASS' : '❌ FAIL'}`)
console.log('='.repeat(60))

if (passedTests === totalTests) {
  console.log('\n🎉 Sample data generation is working correctly!')
  console.log('The generated data is realistic and suitable for dashboard testing.')
} else {
  console.log(`\n❌ ${totalTests - passedTests} sample data tests failed.`)
  console.log('Please review the generateSampleData function.')
}

process.exit(passedTests === totalTests ? 0 : 1)