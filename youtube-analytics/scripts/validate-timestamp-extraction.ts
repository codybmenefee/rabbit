#!/usr/bin/env tsx

/**
 * Comprehensive Timestamp Extraction Validation Suite
 * 
 * Tests the resilient timestamp extractor against various edge cases,
 * international formats, and real-world scenarios to ensure data integrity.
 */

import { extractTimestamp, getTimestampExtractionStats, resetTimestampExtractionStats } from '../lib/resilient-timestamp-extractor'
import { YouTubeHistoryParserCore } from '../lib/parser-core'
import * as fs from 'fs'
import * as path from 'path'

interface TestCase {
  name: string
  textContent: string
  innerHTML: string
  expected: {
    timestamp: string | null
    confidence?: number
    quality?: Partial<{
      hasTimezone: boolean
      hasFullDateTime: boolean
      formatRecognized: boolean
      dateReasonable: boolean
    }>
  }
  category: 'standard' | 'edge-case' | 'international' | 'malformed'
}

// Comprehensive test cases covering various scenarios
const testCases: TestCase[] = [
  // Standard Google Takeout formats
  {
    name: 'Standard US Format with Timezone',
    textContent: 'Watched video Aug 11, 2025, 10:30:00 PM CDT',
    innerHTML: 'Watched video <br>Aug 11, 2025, 10:30:00 PM CDT',
    expected: {
      timestamp: '2025-08-12T03:30:00.000Z', // CDT to UTC
      confidence: 85,
      quality: { hasTimezone: true, hasFullDateTime: true, formatRecognized: true, dateReasonable: true }
    },
    category: 'standard'
  },
  {
    name: 'Standard US Format without Timezone',
    textContent: 'Watched video Aug 10, 2025, 8:15:00 PM',
    innerHTML: 'Watched video <br>Aug 10, 2025, 8:15:00 PM',
    expected: {
      timestamp: '2025-08-11T01:15:00.000Z',
      confidence: 75,
      quality: { hasTimezone: false, hasFullDateTime: true, formatRecognized: true, dateReasonable: true }
    },
    category: 'standard'
  },
  {
    name: 'MM/DD/YYYY Format',
    textContent: 'Date: 8/11/2025, 10:30:00 PM',
    innerHTML: 'Date: 8/11/2025, 10:30:00 PM',
    expected: {
      timestamp: '2025-08-12T03:30:00.000Z',
      confidence: 70,
      quality: { hasTimezone: false, hasFullDateTime: true, formatRecognized: false, dateReasonable: true }
    },
    category: 'standard'
  },
  
  // Edge cases
  {
    name: 'No Timestamp Present',
    textContent: 'Video title with no date information',
    innerHTML: 'Video title with no date information',
    expected: {
      timestamp: null,
      confidence: 0
    },
    category: 'edge-case'
  },
  {
    name: 'Malformed Date',
    textContent: 'Watched video on 32/25/2025, 25:30:00 PM',
    innerHTML: 'Watched video on 32/25/2025, 25:30:00 PM',
    expected: {
      timestamp: null,
      confidence: 0
    },
    category: 'malformed'
  },
  {
    name: 'Year 2000 Issue',
    textContent: 'Watched video Jan 1, 2000, 12:00:00 AM EST',
    innerHTML: 'Watched video Jan 1, 2000, 12:00:00 AM EST',
    expected: {
      timestamp: null, // Before YouTube existed (should be rejected by date validation)
      confidence: 0
    },
    category: 'edge-case'
  },
  {
    name: 'Future Date',
    textContent: 'Watched video Dec 31, 2030, 11:59:59 PM UTC',
    innerHTML: 'Watched video Dec 31, 2030, 11:59:59 PM UTC',
    expected: {
      timestamp: null, // Too far in future (should be rejected by date validation)
      confidence: 0
    },
    category: 'edge-case'
  },
  
  // International formats
  {
    name: 'European DD.MM.YYYY Format',
    textContent: 'Video watched 11.08.2025, 22:30:00',
    innerHTML: 'Video watched 11.08.2025, 22:30:00',
    expected: {
      timestamp: '2025-08-11T22:30:00.000Z',
      confidence: 65,
      quality: { hasTimezone: false, hasFullDateTime: true, formatRecognized: false, dateReasonable: true }
    },
    category: 'international'
  },
  {
    name: 'ISO Format',
    textContent: 'Timestamp: 2025-08-11 22:30:00',
    innerHTML: 'Timestamp: 2025-08-11 22:30:00',
    expected: {
      timestamp: '2025-08-11T22:30:00.000Z',
      confidence: 70,
      quality: { hasTimezone: false, hasFullDateTime: true, formatRecognized: false, dateReasonable: true }
    },
    category: 'international'
  },
  {
    name: 'French Format',
    textContent: 'Regardé le 11 août 2025 à 22h30',
    innerHTML: 'Regardé le 11 août 2025 à 22h30',
    expected: {
      timestamp: '2025-08-11T22:30:00.000Z',
      confidence: 60,
      quality: { hasTimezone: false, hasFullDateTime: false, formatRecognized: false, dateReasonable: true }
    },
    category: 'international'
  },
  
  // Real-world edge cases
  {
    name: 'Non-breaking Spaces',
    textContent: 'Watched\\u00A0video\\u202FAug\\u00A011,\\u202F2025,\\u00A010:30:00\\u202FPM\\u00A0CDT',
    innerHTML: 'Watched\\u00A0video\\u202F<br>Aug\\u00A011,\\u202F2025,\\u00A010:30:00\\u202FPM\\u00A0CDT',
    expected: {
      timestamp: '2025-08-12T03:30:00.000Z',
      confidence: 80,
      quality: { hasTimezone: true, hasFullDateTime: true, formatRecognized: true, dateReasonable: true }
    },
    category: 'edge-case'
  },
  {
    name: 'Multiple Timestamps (Should Pick First)',
    textContent: 'Video from Aug 11, 2025, 10:30:00 PM CDT originally aired Dec 1, 2024, 8:00:00 PM EST',
    innerHTML: 'Video from Aug 11, 2025, 10:30:00 PM CDT originally aired Dec 1, 2024, 8:00:00 PM EST',
    expected: {
      timestamp: '2025-08-12T03:30:00.000Z', // Should pick first timestamp
      confidence: 80,
      quality: { hasTimezone: true, hasFullDateTime: true, formatRecognized: true, dateReasonable: true }
    },
    category: 'edge-case'
  },
  {
    name: 'Partial Timestamp',
    textContent: 'Watched at 10:30 PM on Aug 11',
    innerHTML: 'Watched at 10:30 PM on Aug 11',
    expected: {
      timestamp: null, // Missing year, should fail validation
      confidence: 0
    },
    category: 'malformed'
  },
  {
    name: 'YouTube Music Format',
    textContent: 'Listened to track on Aug 11, 2025, 10:30:00 PM CDT',
    innerHTML: 'Listened to track on <br>Aug 11, 2025, 10:30:00 PM CDT',
    expected: {
      timestamp: '2025-08-12T03:30:00.000Z',
      confidence: 85,
      quality: { hasTimezone: true, hasFullDateTime: true, formatRecognized: true, dateReasonable: true }
    },
    category: 'standard'
  }
]

// Real HTML test fixtures for integration testing
const htmlTestCases = [
  {
    name: 'Standard Google Takeout HTML',
    html: `
      <div class="content-cell">
        Watched <a href="https://www.youtube.com/watch?v=test1">Test Video 1</a><br>
        <a href="https://www.youtube.com/channel/UC_test">Test Channel</a><br>
        Aug 11, 2025, 10:30:00 PM CDT
      </div>
    `,
    expectedCount: 1,
    category: 'standard'
  },
  {
    name: 'Missing Timestamps in HTML',
    html: `
      <div class="content-cell">
        Watched <a href="https://www.youtube.com/watch?v=test2">Test Video 2</a><br>
        <a href="https://www.youtube.com/channel/UC_test">Test Channel</a>
        <!-- No timestamp line -->
      </div>
    `,
    expectedCount: 1, // Should still parse but with null timestamp
    category: 'edge-case'
  },
  {
    name: 'Mixed Timestamp Quality',
    html: `
      <div class="content-cell">
        Watched <a href="https://www.youtube.com/watch?v=test3">Good Timestamp</a><br>
        <a href="https://www.youtube.com/channel/UC_test">Test Channel</a><br>
        Aug 11, 2025, 10:30:00 PM CDT
      </div>
      <div class="content-cell">
        Watched <a href="https://www.youtube.com/watch?v=test4">Bad Timestamp</a><br>
        <a href="https://www.youtube.com/channel/UC_test">Test Channel</a><br>
        Invalid Date Format
      </div>
      <div class="content-cell">
        Watched <a href="https://www.youtube.com/watch?v=test5">No Timestamp</a><br>
        <a href="https://www.youtube.com/channel/UC_test">Test Channel</a>
      </div>
    `,
    expectedCount: 3,
    category: 'edge-case'
  }
]

interface ValidationResult {
  totalTests: number
  passed: number
  failed: number
  categories: {
    standard: { passed: number; total: number }
    'edge-case': { passed: number; total: number }
    international: { passed: number; total: number }
    malformed: { passed: number; total: number }
  }
  failedTests: Array<{
    name: string
    expected: any
    actual: any
    error?: string
  }>
  performanceMetrics: {
    averageExtractionTime: number
    totalExtractionTime: number
    slowestTest: { name: string; time: number }
  }
}

/**
 * Run comprehensive timestamp extraction validation
 */
async function runValidation(): Promise<ValidationResult> {
  console.log('🧪 Starting Comprehensive Timestamp Extraction Validation\\n')
  
  // Reset extraction stats for clean test run
  resetTimestampExtractionStats()
  
  const result: ValidationResult = {
    totalTests: testCases.length,
    passed: 0,
    failed: 0,
    categories: {
      standard: { passed: 0, total: 0 },
      'edge-case': { passed: 0, total: 0 },
      international: { passed: 0, total: 0 },
      malformed: { passed: 0, total: 0 }
    },
    failedTests: [],
    performanceMetrics: {
      averageExtractionTime: 0,
      totalExtractionTime: 0,
      slowestTest: { name: '', time: 0 }
    }
  }
  
  const extractionTimes: number[] = []
  
  console.log('=== Individual Test Cases ===\\n')
  
  for (const testCase of testCases) {
    const startTime = performance.now()
    
    // Run extraction with debug enabled for detailed analysis
    const extraction = extractTimestamp(testCase.textContent, testCase.innerHTML, {
      debug: true,
      enableMetrics: true,
      minConfidence: 70
    })
    
    const extractionTime = performance.now() - startTime
    extractionTimes.push(extractionTime)
    
    // Track slowest test
    if (extractionTime > result.performanceMetrics.slowestTest.time) {
      result.performanceMetrics.slowestTest = { name: testCase.name, time: extractionTime }
    }
    
    // Validate results
    const passed = validateExtractionResult(testCase, extraction)
    
    if (passed) {
      result.passed++
      result.categories[testCase.category].passed++
      console.log(`✅ ${testCase.name}`)
      console.log(`   Confidence: ${extraction.confidence}%, Strategy: ${extraction.strategy}`)
      console.log(`   Time: ${extractionTime.toFixed(2)}ms\\n`)
    } else {
      result.failed++
      result.failedTests.push({
        name: testCase.name,
        expected: testCase.expected,
        actual: {
          timestamp: extraction.timestamp,
          confidence: extraction.confidence,
          quality: extraction.quality
        }
      })
      console.log(`❌ ${testCase.name}`)
      console.log(`   Expected: ${JSON.stringify(testCase.expected)}`)
      console.log(`   Actual: ${JSON.stringify({
        timestamp: extraction.timestamp,
        confidence: extraction.confidence,
        quality: extraction.quality
      })}`)
      console.log(`   Time: ${extractionTime.toFixed(2)}ms\\n`)
    }
    
    result.categories[testCase.category].total++
  }
  
  // Calculate performance metrics
  result.performanceMetrics.totalExtractionTime = extractionTimes.reduce((sum, time) => sum + time, 0)
  result.performanceMetrics.averageExtractionTime = result.performanceMetrics.totalExtractionTime / extractionTimes.length
  
  console.log('=== HTML Integration Tests ===\\n')
  
  // Run integration tests with parser core
  await runIntegrationTests()
  
  console.log('=== Cross-Contamination Test ===\\n')
  
  // Test for cross-contamination between records
  await runCrossContaminationTest()
  
  return result
}

/**
 * Validate extraction result against expected values
 */
function validateExtractionResult(testCase: TestCase, extraction: any): boolean {
  const { expected } = testCase
  
  // Check timestamp
  if (expected.timestamp === null) {
    if (extraction.timestamp !== null) return false
  } else {
    if (extraction.timestamp === null) return false
    
    // Allow for timezone differences (up to 24 hours)
    const expectedDate = new Date(expected.timestamp)
    const actualDate = new Date(extraction.timestamp)
    const diffHours = Math.abs(expectedDate.getTime() - actualDate.getTime()) / (1000 * 60 * 60)
    
    if (diffHours > 24) return false
  }
  
  // Check confidence (allow ±10% tolerance)
  if (expected.confidence !== undefined) {
    const confidenceDiff = Math.abs(extraction.confidence - expected.confidence)
    if (confidenceDiff > 10) return false
  }
  
  // Check quality indicators
  if (expected.quality) {
    for (const [key, value] of Object.entries(expected.quality)) {
      if (extraction.quality[key] !== value) return false
    }
  }
  
  return true
}

/**
 * Run integration tests with full HTML parsing
 */
async function runIntegrationTests(): Promise<void> {
  const parser = new YouTubeHistoryParserCore()
  
  for (const testCase of htmlTestCases) {
    console.log(`🔧 Integration Test: ${testCase.name}`)
    
    try {
      const records = await parser.parseHTML(testCase.html, {
        enableTimestampValidation: true,
        logTimestampFailures: true,
        minTimestampConfidence: 70
      })
      
      if (records.length === testCase.expectedCount) {
        console.log(`✅ Parsed ${records.length} records as expected`)
        
        // Analyze timestamp quality
        const withTimestamps = records.filter(r => r.watchedAt !== null).length
        const withoutTimestamps = records.filter(r => r.watchedAt === null).length
        
        console.log(`   With timestamps: ${withTimestamps}/${records.length}`)
        console.log(`   Without timestamps: ${withoutTimestamps}/${records.length}`)
        
        // Get timestamp stats from parser
        const stats = parser.getTimestampStats()
        console.log(`   Extraction stats: ${stats.recordsWithTimestamps}/${stats.totalRecords} successful`)
        
      } else {
        console.log(`❌ Expected ${testCase.expectedCount} records, got ${records.length}`)
      }
    } catch (error) {
      console.log(`❌ Integration test failed: ${error}`)
    }
    
    console.log('')
  }
}

/**
 * Test for cross-contamination between timestamp extractions
 */
async function runCrossContaminationTest(): Promise<void> {
  console.log('🧬 Testing for cross-contamination between records...')
  
  const parser = new YouTubeHistoryParserCore()
  
  // HTML with multiple entries having DIFFERENT timestamps
  const testHTML = `
    <div class="content-cell">
      Watched <a href="https://www.youtube.com/watch?v=test1">Video 1</a><br>
      <a href="https://www.youtube.com/channel/UC_test">Channel 1</a><br>
      Aug 11, 2025, 10:30:00 PM CDT
    </div>
    <div class="content-cell">
      Watched <a href="https://www.youtube.com/watch?v=test2">Video 2</a><br>
      <a href="https://www.youtube.com/channel/UC_test">Channel 2</a><br>
      Aug 10, 2025, 8:15:00 PM CDT
    </div>
    <div class="content-cell">
      Watched <a href="https://www.youtube.com/watch?v=test3">Video 3</a><br>
      <a href="https://www.youtube.com/channel/UC_test">Channel 3</a><br>
      Jul 25, 2025, 6:45:00 PM CDT
    </div>
    <div class="content-cell">
      Watched <a href="https://www.youtube.com/watch?v=test4">Video 4</a><br>
      <a href="https://www.youtube.com/channel/UC_test">Channel 4</a><br>
      Jun 20, 2025, 2:00:00 PM CDT
    </div>
  `
  
  try {
    const records = await parser.parseHTML(testHTML, {
      enableTimestampValidation: true,
      logTimestampFailures: false, // Disable detailed logging for cleaner output
      minTimestampConfidence: 70
    })
    
    console.log(`Parsed ${records.length} records`)
    
    // Check for uniqueness (no cross-contamination)
    const uniqueTimestamps = new Set(records.map(r => r.watchedAt).filter(t => t !== null))
    const recordsWithTimestamps = records.filter(r => r.watchedAt !== null)
    
    console.log(`Total records: ${records.length}`)
    console.log(`Records with timestamps: ${recordsWithTimestamps.length}`)
    console.log(`Unique timestamps: ${uniqueTimestamps.size}`)
    
    if (uniqueTimestamps.size === recordsWithTimestamps.length) {
      console.log(`✅ PASS: All timestamps are unique (no cross-contamination)`)
    } else {
      console.log(`❌ FAIL: Duplicate timestamps detected (cross-contamination present)`)
      
      // Log duplicate analysis
      const timestampCounts = new Map<string, number>()
      recordsWithTimestamps.forEach(r => {
        const count = timestampCounts.get(r.watchedAt!) || 0
        timestampCounts.set(r.watchedAt!, count + 1)
      })
      
      for (const [timestamp, count] of timestampCounts.entries()) {
        if (count > 1) {
          console.log(`   Duplicate: ${timestamp} appears ${count} times`)
        }
      }
    }
    
    // Verify expected timestamp differences
    const expectedTimestamps = [
      '2025-08-12T03:30:00.000Z', // Aug 11, 2025, 10:30:00 PM CDT
      '2025-08-11T01:15:00.000Z', // Aug 10, 2025, 8:15:00 PM CDT  
      '2025-07-26T00:45:00.000Z', // Jul 25, 2025, 6:45:00 PM CDT
      '2025-06-20T19:00:00.000Z'  // Jun 20, 2025, 2:00:00 PM CDT
    ]
    
    let correctExtractions = 0
    records.forEach((record, i) => {
      if (record.watchedAt && expectedTimestamps[i]) {
        const parsed = new Date(record.watchedAt)
        const expected = new Date(expectedTimestamps[i])
        const diffMs = Math.abs(parsed.getTime() - expected.getTime())
        const diffHours = diffMs / (1000 * 60 * 60)
        
        if (diffHours < 24) { // Allow timezone tolerance
          correctExtractions++
        } else {
          console.log(`   ❌ Record ${i + 1}: Expected ${expectedTimestamps[i]}, got ${record.watchedAt}`)
        }
      }
    })
    
    console.log(`Correct extractions: ${correctExtractions}/${recordsWithTimestamps.length}`)
    
    if (correctExtractions === recordsWithTimestamps.length) {
      console.log(`✅ PASS: All timestamps extracted correctly`)
    } else {
      console.log(`❌ FAIL: Some timestamps extracted incorrectly`)
    }
    
  } catch (error) {
    console.log(`❌ Cross-contamination test failed: ${error}`)
  }
}

/**
 * Generate validation report
 */
function generateReport(result: ValidationResult): void {
  console.log('\\n' + '='.repeat(60))
  console.log('📊 VALIDATION REPORT')
  console.log('='.repeat(60))
  
  const successRate = (result.passed / result.totalTests) * 100
  
  console.log(`\\n🎯 Overall Results:`)
  console.log(`   Total Tests: ${result.totalTests}`)
  console.log(`   Passed: ${result.passed} (${successRate.toFixed(1)}%)`)
  console.log(`   Failed: ${result.failed}`)
  
  console.log(`\\n📂 Results by Category:`)
  for (const [category, stats] of Object.entries(result.categories)) {
    const categoryRate = stats.total > 0 ? (stats.passed / stats.total) * 100 : 0
    console.log(`   ${category}: ${stats.passed}/${stats.total} (${categoryRate.toFixed(1)}%)`)
  }
  
  console.log(`\\n⏱️  Performance Metrics:`)
  console.log(`   Average extraction time: ${result.performanceMetrics.averageExtractionTime.toFixed(2)}ms`)
  console.log(`   Total extraction time: ${result.performanceMetrics.totalExtractionTime.toFixed(2)}ms`)
  console.log(`   Slowest test: ${result.performanceMetrics.slowestTest.name} (${result.performanceMetrics.slowestTest.time.toFixed(2)}ms)`)
  
  if (result.failedTests.length > 0) {
    console.log(`\\n❌ Failed Tests:`)
    result.failedTests.forEach((test, i) => {
      console.log(`   ${i + 1}. ${test.name}`)
      console.log(`      Expected: ${JSON.stringify(test.expected)}`)
      console.log(`      Actual: ${JSON.stringify(test.actual)}`)
    })
  }
  
  // Global extraction statistics
  const globalStats = getTimestampExtractionStats()
  console.log(`\\n🌍 Global Extraction Statistics:`)
  console.log(`   Total attempts: ${globalStats.totalAttempts}`)
  console.log(`   Successful extractions: ${globalStats.successfulExtractions}`)
  console.log(`   Failed extractions: ${globalStats.failedExtractions}`)
  console.log(`   Overall success rate: ${globalStats.overallSuccessRate.toFixed(1)}%`)
  
  if (globalStats.strategyPerformance.length > 0) {
    console.log(`\\n🔧 Strategy Performance:`)
    globalStats.strategyPerformance
      .sort((a, b) => b.successRate - a.successRate)
      .forEach(strategy => {
        console.log(`   ${strategy.strategy}: ${strategy.successes}/${strategy.attempts} (${strategy.successRate.toFixed(1)}%)`)
      })
  }
  
  console.log(`\\n` + '='.repeat(60))
  
  // Final verdict
  if (successRate >= 90) {
    console.log('🎉 EXCELLENT: Timestamp extraction is performing very well!')
  } else if (successRate >= 80) {
    console.log('👍 GOOD: Timestamp extraction is performing adequately with some room for improvement.')
  } else if (successRate >= 70) {
    console.log('⚠️  FAIR: Timestamp extraction needs attention. Consider reviewing failed test cases.')
  } else {
    console.log('🚨 POOR: Timestamp extraction is not meeting quality standards. Immediate attention required.')
  }
}

/**
 * Save validation results to file
 */
function saveResults(result: ValidationResult): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const filename = `timestamp-validation-${timestamp}.json`
  const filepath = path.join(__dirname, '..', 'docs', 'validation-reports', filename)
  
  // Ensure directory exists
  const dir = path.dirname(filepath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  // Save results with global stats
  const fullReport = {
    ...result,
    globalStats: getTimestampExtractionStats(),
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    }
  }
  
  fs.writeFileSync(filepath, JSON.stringify(fullReport, null, 2))
  console.log(`\\n💾 Validation results saved to: ${filepath}`)
}

// Main execution
async function main() {
  try {
    const result = await runValidation()
    generateReport(result)
    saveResults(result)
    
    // Exit with appropriate code
    process.exit(result.failed > 0 ? 1 : 0)
    
  } catch (error) {
    console.error('❌ Validation suite failed:', error)
    process.exit(1)
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

export { runValidation, ValidationResult }