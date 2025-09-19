#!/usr/bin/env tsx

/**
 * Data Structure Validation
 * 
 * Validates the structure and integrity of WatchRecord data
 * without importing React components.
 */

import { WatchRecord } from '../types/records'
import { normalizeWatchRecord } from '../lib/aggregations'
import { parseISO, isValid, differenceInDays } from 'date-fns'

console.log('🏗️ DATA STRUCTURE VALIDATION')
console.log('='.repeat(60))

// Test the normalizeWatchRecord function with various inputs
function testDataNormalization() {
  console.log('\n📋 Testing Data Normalization...')
  
  const testCases = [
    {
      name: 'Complete data',
      input: {
        videoTitle: 'Complete Test Video',
        videoUrl: 'https://youtube.com/watch?v=test123',
        videoId: 'test123',
        channelTitle: 'Test Channel',
        channelUrl: 'https://youtube.com/channel/testchannel',
        watchedAt: '2025-08-10T14:30:00.000Z',
        product: 'YouTube',
        rawTimestamp: 'Aug 10, 2025, 2:30:00 PM UTC'
      }
    },
    {
      name: 'Minimal data',
      input: {
        videoTitle: 'Minimal Video',
        watchedAt: '2025-08-10T10:00:00.000Z'
      }
    },
    {
      name: 'YouTube Music data',
      input: {
        videoTitle: 'Music Video',
        channelTitle: 'Music Channel',
        watchedAt: '2025-08-10T16:00:00.000Z',
        product: 'YouTube Music'
      }
    },
    {
      name: 'Null timestamp',
      input: {
        videoTitle: 'No Timestamp Video',
        channelTitle: 'Test Channel',
        watchedAt: null
      }
    }
  ]
  
  let passed = 0
  
  testCases.forEach(({ name, input }) => {
    try {
      const normalized = normalizeWatchRecord(input)
      
      // Check required fields are present
      const hasRequiredFields = normalized.id && 
                               normalized.videoTitle && 
                               normalized.channelTitle &&
                               Array.isArray(normalized.topics) &&
                               normalized.topics.length > 0 &&
                               ['YouTube', 'YouTube Music'].includes(normalized.product)
      
      // Check date consistency if timestamp provided
      let dateConsistent = true
      if (normalized.watchedAt && normalized.year && normalized.month && normalized.hour) {
        const date = parseISO(normalized.watchedAt)
        dateConsistent = date.getFullYear() === normalized.year &&
                        date.getMonth() + 1 === normalized.month &&
                        date.getHours() === normalized.hour
      }
      
      const testPassed = hasRequiredFields && dateConsistent
      
      console.log(`   ${testPassed ? '✅' : '❌'} ${name}`)
      if (!testPassed) {
        console.log(`      Required fields: ${hasRequiredFields}`)
        console.log(`      Date consistent: ${dateConsistent}`)
        console.log(`      Result: ${JSON.stringify(normalized, null, 2)}`)
      }
      
      if (testPassed) passed++
      
    } catch (error) {
      console.log(`   ❌ ${name} - Error: ${error}`)
    }
  })
  
  return passed === testCases.length
}

// Test realistic sample data generation
function testSampleDataStructure() {
  console.log('\n🎲 Testing Sample Data Structure...')
  
  const sampleData: WatchRecord[] = []
  const topics = ['Technology', 'Education', 'Gaming', 'Music', 'Science', 'Finance']
  const channels = ['Tech Channel', 'Edu Hub', 'Game Zone', 'Music World', 'Science Today', 'Finance Pro']
  
  // Generate small sample dataset
  const startDate = new Date('2024-01-01')
  const endDate = new Date('2025-08-10')
  
  for (let i = 0; i < 50; i++) {
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
  
  console.log(`   Generated ${sampleData.length} sample records`)
  
  // Validate structure
  const tests = {
    allHaveIds: sampleData.every(r => r.id),
    allHaveValidDates: sampleData.every(r => r.watchedAt && isValid(parseISO(r.watchedAt))),
    allHaveTopics: sampleData.every(r => r.topics.length > 0),
    channelsDistributed: new Set(sampleData.map(r => r.channelTitle)).size >= 3,
    topicsDistributed: new Set(sampleData.flatMap(r => r.topics)).size >= 3,
    bothProducts: sampleData.some(r => r.product === 'YouTube') && 
                  sampleData.some(r => r.product === 'YouTube Music'),
    dateComponentsConsistent: sampleData.every(r => {
      if (!r.watchedAt) return true
      const date = parseISO(r.watchedAt)
      return date.getFullYear() === r.year &&
             date.getMonth() + 1 === r.month &&
             date.getHours() === r.hour
    })
  }
  
  Object.entries(tests).forEach(([testName, passed]) => {
    console.log(`   ${passed ? '✅' : '❌'} ${testName}`)
  })
  
  return Object.values(tests).every(Boolean)
}

// Test edge cases
function testEdgeCases() {
  console.log('\n🔍 Testing Edge Cases...')
  
  const edgeCases = [
    {
      name: 'Empty string fields',
      input: { videoTitle: '', channelTitle: '', watchedAt: '2025-08-10T12:00:00Z' }
    },
    {
      name: 'Special characters in title',
      input: { 
        videoTitle: 'Video with 特殊字符 & émojis 🎥',
        channelTitle: 'Çhäññël Ñámé',
        watchedAt: '2025-08-10T12:00:00Z'
      }
    },
    {
      name: 'Very long strings',
      input: {
        videoTitle: 'A'.repeat(500),
        channelTitle: 'B'.repeat(200),
        watchedAt: '2025-08-10T12:00:00Z'
      }
    }
  ]
  
  let passed = 0
  
  edgeCases.forEach(({ name, input }) => {
    try {
      const result = normalizeWatchRecord(input)
      const hasValidId = result.id && result.id.length > 0
      const hasValidTitle = result.videoTitle && result.videoTitle !== ''
      const hasValidChannel = result.channelTitle && result.channelTitle !== ''
      const hasTopics = result.topics && result.topics.length > 0
      
      const testPassed = hasValidId && hasValidTitle && hasValidChannel && hasTopics
      
      console.log(`   ${testPassed ? '✅' : '❌'} ${name}`)
      if (!testPassed) {
        console.log(`      ID: ${hasValidId}, Title: ${hasValidTitle}, Channel: ${hasValidChannel}, Topics: ${hasTopics}`)
      }
      
      if (testPassed) passed++
      
    } catch (error) {
      console.log(`   ❌ ${name} - Error: ${error}`)
    }
  })
  
  return passed === edgeCases.length
}

// Main test execution
async function main() {
  const tests = [
    testDataNormalization,
    testSampleDataStructure,
    testEdgeCases
  ]
  
  const results = tests.map(test => test())
  const passedTests = results.filter(Boolean).length
  const totalTests = results.length
  
  console.log('\n' + '='.repeat(60))
  console.log('🎯 DATA STRUCTURE VALIDATION SUMMARY')
  console.log(`Tests Passed: ${passedTests}/${totalTests}`)
  console.log(`Overall Status: ${passedTests === totalTests ? '✅ PASS' : '❌ FAIL'}`)
  console.log('='.repeat(60))
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All data structure validations passed!')
    console.log('Data normalization and sample generation are working correctly.')
  } else {
    console.log(`\n❌ ${totalTests - passedTests} data structure tests failed.`)
  }
  
  process.exit(passedTests === totalTests ? 0 : 1)
}

main()