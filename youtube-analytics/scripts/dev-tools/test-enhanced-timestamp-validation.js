#!/usr/bin/env node

/**
 * Enhanced Timestamp Validation Test Script
 * 
 * Tests the new timestamp validation and logging enhancements:
 * - ResilientTimestampExtractor with confidence scoring
 * - Parser core with detailed logging
 * - Quality metrics and success rate tracking
 * - International format support
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

console.log('🧪 ENHANCED TIMESTAMP VALIDATION TEST SUITE\n')

// Test 1: Run the comprehensive validation script
console.log('=== Test 1: Comprehensive Validation Script ===\n')

try {
  console.log('Running validation script...')
  const result = execSync('npx tsx scripts/validate-timestamp-extraction.ts', { 
    encoding: 'utf8',
    cwd: __dirname
  })
  console.log(result)
  console.log('✅ Validation script completed successfully\n')
} catch (error) {
  console.log('❌ Validation script failed:')
  console.log(error.stdout || error.message)
  console.log('')
}

// Test 2: Test parser core with real HTML fixture
console.log('=== Test 2: Parser Core Integration Test ===\n')

async function testParserCore() {
  try {
    // Import modules dynamically
    const { YouTubeHistoryParserCore } = await import('./lib/parser-core.ts')
    
    const parser = new YouTubeHistoryParserCore()
    
    // Read the null timestamp test fixture
    const fixturePath = path.join(__dirname, 'tests/fixtures/null-timestamp-test.html')
    
    if (!fs.existsSync(fixturePath)) {
      console.log('❌ Test fixture not found at:', fixturePath)
      return
    }
    
    const htmlContent = fs.readFileSync(fixturePath, 'utf8')
    console.log('📁 Loaded test fixture:', fixturePath)
    
    // Parse with enhanced options
    console.log('🔍 Parsing HTML with enhanced timestamp validation...')
    const startTime = Date.now()
    
    const records = await parser.parseHTML(htmlContent, {
      enableTimestampValidation: true,
      logTimestampFailures: true,
      minTimestampConfidence: 70
    })
    
    const parseTime = Date.now() - startTime
    
    console.log(`⏱️  Parsing completed in ${parseTime}ms`)
    console.log(`📊 Parsed ${records.length} records`)
    
    // Analyze results
    const recordsWithTimestamps = records.filter(r => r.watchedAt !== null)
    const recordsWithoutTimestamps = records.filter(r => r.watchedAt === null)
    
    console.log(`   • With valid timestamps: ${recordsWithTimestamps.length}`)
    console.log(`   • Without timestamps: ${recordsWithoutTimestamps.length}`)
    
    // Get timestamp stats from parser
    const timestampStats = parser.getTimestampStats()
    console.log(`   • Extraction success rate: ${timestampStats.recordsWithTimestamps}/${timestampStats.totalRecords}`)
    console.log(`   • Average confidence: ${timestampStats.averageConfidence.toFixed(1)}%`)
    console.log(`   • Extraction failures: ${timestampStats.timestampExtractionFailures}`)
    
    // Quality breakdown
    if (timestampStats.recordsWithTimestamps > 0) {
      console.log(`   • With timezones: ${timestampStats.qualityMetrics.withTimezones}/${timestampStats.recordsWithTimestamps}`)
      console.log(`   • Recognized format: ${timestampStats.qualityMetrics.formatRecognized}/${timestampStats.recordsWithTimestamps}`)
      console.log(`   • Full date-time: ${timestampStats.qualityMetrics.withFullDateTime}/${timestampStats.recordsWithTimestamps}`)
    }
    
    // Strategy usage
    if (Object.keys(timestampStats.strategyUsage).length > 0) {
      console.log(`   • Strategy usage:`)
      Object.entries(timestampStats.strategyUsage).forEach(([strategy, count]) => {
        console.log(`     - ${strategy}: ${count}`)
      })
    }
    
    console.log('✅ Parser core integration test completed\n')
    
  } catch (error) {
    console.log('❌ Parser core test failed:', error.message)
    console.log('')
  }
}

// Test 3: Test resilient extractor directly
console.log('=== Test 3: Resilient Extractor Direct Test ===\n')

async function testResilientExtractor() {
  try {
    const { extractTimestamp, getTimestampExtractionStats, resetTimestampExtractionStats } = await import('./lib/resilient-timestamp-extractor.ts')
    
    // Reset stats for clean test
    resetTimestampExtractionStats()
    
    const testCases = [
      {
        name: 'Standard Format with Timezone',
        text: 'Watched Aug 11, 2025, 10:30:00 PM CDT',
        html: 'Watched <br>Aug 11, 2025, 10:30:00 PM CDT',
        expectSuccess: true
      },
      {
        name: 'No Timezone',
        text: 'Watched Aug 10, 2025, 8:15:00 PM',
        html: 'Watched <br>Aug 10, 2025, 8:15:00 PM',
        expectSuccess: true
      },
      {
        name: 'MM/DD/YYYY Format',
        text: 'Date: 8/11/2025, 10:30:00 PM',
        html: 'Date: 8/11/2025, 10:30:00 PM',
        expectSuccess: true
      },
      {
        name: 'Invalid Format',
        text: 'Some random text with no date',
        html: 'Some random text with no date',
        expectSuccess: false
      },
      {
        name: 'Malformed Date',
        text: 'Date: 32/99/2025, 25:99:99 XM',
        html: 'Date: 32/99/2025, 25:99:99 XM',
        expectSuccess: false
      },
      {
        name: 'Non-breaking Spaces',
        text: 'Watched\u00A0Aug\u202F11,\u00A02025,\u202F10:30:00\u00A0PM\u202FCDT',
        html: 'Watched\u00A0<br>Aug\u202F11,\u00A02025,\u202F10:30:00\u00A0PM\u202FCDT',
        expectSuccess: true
      },
      {
        name: 'International Format (European)',
        text: 'Video watched 11.08.2025, 22:30:00',
        html: 'Video watched 11.08.2025, 22:30:00',
        expectSuccess: true
      }
    ]
    
    let passed = 0
    let failed = 0
    
    console.log('🔬 Testing resilient timestamp extractor...\n')
    
    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.name}`)
      
      const startTime = performance.now()
      const result = extractTimestamp(testCase.text, testCase.html, {
        debug: true,
        enableMetrics: true,
        minConfidence: 70
      })
      const extractionTime = performance.now() - startTime
      
      const success = testCase.expectSuccess ? result.timestamp !== null : result.timestamp === null
      
      if (success) {
        passed++
        console.log(`  ✅ PASS`)
      } else {
        failed++
        console.log(`  ❌ FAIL`)
      }
      
      console.log(`     Timestamp: ${result.timestamp}`)
      console.log(`     Confidence: ${result.confidence}%`)
      console.log(`     Strategy: ${result.strategy}`)
      console.log(`     Extraction time: ${extractionTime.toFixed(2)}ms`)
      
      if (result.quality) {
        console.log(`     Quality: TZ:${result.quality.hasTimezone}, Full:${result.quality.hasFullDateTime}, Format:${result.quality.formatRecognized}, Date:${result.quality.dateReasonable}`)
      }
      
      if (result.debugInfo && result.debugInfo.attempts.length > 0) {
        console.log(`     Debug: ${result.debugInfo.attempts.length} attempts, ${result.debugInfo.totalTimeMs.toFixed(2)}ms total`)
      }
      
      console.log('')
    }
    
    // Get global stats
    const globalStats = getTimestampExtractionStats()
    
    console.log('📈 Test Results Summary:')
    console.log(`   Passed: ${passed}`)
    console.log(`   Failed: ${failed}`)
    console.log(`   Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%`)
    
    console.log('🌍 Global Extraction Stats:')
    console.log(`   Total attempts: ${globalStats.totalAttempts}`)
    console.log(`   Successful: ${globalStats.successfulExtractions}`)
    console.log(`   Failed: ${globalStats.failedExtractions}`)
    console.log(`   Overall success rate: ${globalStats.overallSuccessRate.toFixed(1)}%`)
    
    if (globalStats.strategyPerformance.length > 0) {
      console.log('🔧 Strategy Performance:')
      globalStats.strategyPerformance
        .sort((a, b) => b.successRate - a.successRate)
        .forEach(strategy => {
          console.log(`   ${strategy.strategy}: ${strategy.successes}/${strategy.attempts} (${strategy.successRate.toFixed(1)}%)`)
        })
    }
    
    console.log('✅ Resilient extractor test completed\n')
    
  } catch (error) {
    console.log('❌ Resilient extractor test failed:', error.message)
    console.log('')
  }
}

// Test 4: Confidence scoring validation
console.log('=== Test 4: Confidence Scoring Validation ===\n')

async function testConfidenceScoring() {
  try {
    const { extractTimestamp } = await import('./lib/resilient-timestamp-extractor.ts')
    
    const confidenceTestCases = [
      {
        name: 'High Confidence (Google Takeout + TZ)',
        text: 'Aug 11, 2025, 10:30:00 PM CDT',
        expectedConfidenceRange: [80, 100]
      },
      {
        name: 'Medium Confidence (No timezone)',
        text: 'Aug 11, 2025, 10:30:00 PM',
        expectedConfidenceRange: [60, 85]
      },
      {
        name: 'Lower Confidence (Different format)',
        text: '8/11/2025, 10:30:00 PM',
        expectedConfidenceRange: [50, 75]
      },
      {
        name: 'Very Low Confidence (Fallback)',
        text: '2025-08-11 22:30:00',
        expectedConfidenceRange: [40, 70]
      }
    ]
    
    console.log('🎯 Testing confidence scoring accuracy...\n')
    
    for (const testCase of confidenceTestCases) {
      const result = extractTimestamp(testCase.text, '', {
        enableMetrics: true,
        minConfidence: 0 // Allow all results for testing
      })
      
      const inRange = result.confidence >= testCase.expectedConfidenceRange[0] && 
                     result.confidence <= testCase.expectedConfidenceRange[1]
      
      console.log(`${testCase.name}:`)
      console.log(`  Expected: ${testCase.expectedConfidenceRange[0]}-${testCase.expectedConfidenceRange[1]}%`)
      console.log(`  Actual: ${result.confidence}%`)
      console.log(`  ${inRange ? '✅ PASS' : '❌ FAIL'}: Confidence in expected range`)
      console.log('')
    }
    
    console.log('✅ Confidence scoring validation completed\n')
    
  } catch (error) {
    console.log('❌ Confidence scoring test failed:', error.message)
    console.log('')
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testParserCore()
    await testResilientExtractor()
    await testConfidenceScoring()
    
    console.log('🎉 All enhanced timestamp validation tests completed!')
    console.log('\n📋 Next Steps:')
    console.log('  1. Review any failed tests above')
    console.log('  2. Check the History page for enhanced timestamp quality reporting')
    console.log('  3. Monitor timestamp extraction performance in production')
    console.log('  4. Run the full validation suite: npx tsx scripts/validate-timestamp-extraction.ts')
    
  } catch (error) {
    console.error('❌ Test suite failed:', error)
    process.exit(1)
  }
}

runAllTests()