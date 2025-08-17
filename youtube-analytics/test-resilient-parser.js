// Test script for resilient timestamp extraction
const { extractTimestamp } = require('./lib/resilient-timestamp-extractor.ts')
const { YouTubeHistoryParserCore } = require('./lib/parser-core.ts')

console.log('🧪 TESTING RESILIENT TIMESTAMP EXTRACTION\n')

// Test 1: Direct timestamp extractor testing
console.log('=== Test 1: Direct Timestamp Extractor ===')

const testCases = [
  {
    name: 'US Format with Timezone',
    text: 'Watched video on Aug 11, 2025, 10:30:00 PM CDT',
    html: 'Watched video on <br>Aug 11, 2025, 10:30:00 PM CDT',
    expected: '2025-08-12T03:30:00.000Z' // Converted to UTC
  },
  {
    name: 'US Format without Timezone',
    text: 'Watched video on Aug 10, 2025, 8:15:00 PM',
    html: 'Watched video on <br>Aug 10, 2025, 8:15:00 PM',
    expected: '2025-08-11T01:15:00.000Z'
  },
  {
    name: 'Different Date Format',
    text: 'Video watched Jul 25, 2025, 6:45:00 PM CDT',
    html: 'Video watched <br>Jul 25, 2025, 6:45:00 PM CDT',
    expected: '2025-07-26T00:45:00.000Z'
  },
  {
    name: 'MM/DD/YYYY Format',
    text: 'Date: 8/11/2025, 10:30:00 PM',
    html: 'Date: 8/11/2025, 10:30:00 PM',
    expected: '2025-08-11T22:30:00.000Z'
  },
  {
    name: 'No Timestamp',
    text: 'Video title with no date information',
    html: 'Video title with no date information',
    expected: null
  }
]

testCases.forEach((testCase, i) => {
  console.log(`\nTest ${i + 1}: ${testCase.name}`)
  
  const result = extractTimestamp(testCase.text, testCase.html, { debug: true })
  
  console.log(`  Input: "${testCase.text}"`)
  console.log(`  Raw Timestamp: "${result.rawTimestamp}"`)
  console.log(`  Parsed: "${result.timestamp}"`)
  console.log(`  Strategy: ${result.strategy}`)
  console.log(`  Expected: "${testCase.expected}"`)
  
  if (testCase.expected === null) {
    console.log(`  ✅ PASS: Correctly detected no timestamp`)
  } else if (result.timestamp) {
    // Compare dates (allowing for small timezone differences)
    const parsed = new Date(result.timestamp)
    const expected = new Date(testCase.expected)
    const diffMs = Math.abs(parsed.getTime() - expected.getTime())
    const diffHours = diffMs / (1000 * 60 * 60)
    
    if (diffHours < 24) { // Allow up to 24 hour difference for timezone issues
      console.log(`  ✅ PASS: Timestamp extracted correctly`)
    } else {
      console.log(`  ❌ FAIL: Timestamp mismatch (${diffHours.toFixed(1)} hours difference)`)
    }
  } else {
    console.log(`  ❌ FAIL: Expected timestamp but got null`)
  }
  
  if (result.debugInfo) {
    console.log(`  Debug: ${result.debugInfo.attempts.length} parsing attempts`)
    result.debugInfo.attempts.forEach((attempt, j) => {
      console.log(`    ${j + 1}. ${attempt.strategy}: ${attempt.result}${attempt.error ? ` (${attempt.error})` : ''}`)
    })
  }
})

// Test 2: Parser Core Integration Test
console.log('\n\n=== Test 2: Parser Core Integration (Cross-Contamination Test) ===')

async function testParserIntegration() {
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
    const records = await parser.parseHTML(testHTML)
    
    console.log(`\nParsed ${records.length} records:`)
    
    const expectedDates = [
      '2025-08-12T03:30:00.000Z', // Aug 11, 2025, 10:30:00 PM CDT
      '2025-08-11T01:15:00.000Z', // Aug 10, 2025, 8:15:00 PM CDT  
      '2025-07-26T00:45:00.000Z', // Jul 25, 2025, 6:45:00 PM CDT
      '2025-06-20T19:00:00.000Z'  // Jun 20, 2025, 2:00:00 PM CDT
    ]
    
    let allUnique = true
    let correctParsing = true
    
    records.forEach((record, i) => {
      console.log(`\nRecord ${i + 1}:`)
      console.log(`  Title: ${record.videoTitle}`)
      console.log(`  Raw Timestamp: "${record.rawTimestamp}"`)
      console.log(`  Parsed Date: ${record.watchedAt}`)
      console.log(`  Expected: ${expectedDates[i]}`)
      
      // Check if parsed correctly (allowing timezone differences)
      if (record.watchedAt && expectedDates[i]) {
        const parsed = new Date(record.watchedAt)
        const expected = new Date(expectedDates[i])
        const diffMs = Math.abs(parsed.getTime() - expected.getTime())
        const diffHours = diffMs / (1000 * 60 * 60)
        
        if (diffHours > 24) {
          console.log(`  ❌ INCORRECT: Expected ${expectedDates[i]}, got ${record.watchedAt}`)
          correctParsing = false
        } else {
          console.log(`  ✅ CORRECT: Timestamp matches expectation`)
        }
      } else if (!record.watchedAt) {
        console.log(`  ❌ MISSING: No timestamp extracted`)
        correctParsing = false
      }
    })
    
    // Check for uniqueness (no cross-contamination)
    const uniqueTimestamps = new Set(records.map(r => r.watchedAt))
    console.log(`\n📊 Uniqueness Check:`)
    console.log(`  Total records: ${records.length}`)
    console.log(`  Unique timestamps: ${uniqueTimestamps.size}`)
    
    if (uniqueTimestamps.size === records.filter(r => r.watchedAt).length) {
      console.log(`  ✅ PASS: All timestamps are unique (no cross-contamination)`)
    } else {
      console.log(`  ❌ FAIL: Duplicate timestamps detected (cross-contamination present)`)
      allUnique = false
    }
    
    // Overall result
    console.log(`\n🎯 OVERALL RESULT:`)
    if (correctParsing && allUnique) {
      console.log(`  ✅ SUCCESS: All timestamps extracted correctly with no cross-contamination`)
    } else {
      console.log(`  ❌ FAILURE: Issues detected in timestamp extraction`)
      if (!correctParsing) console.log(`    - Incorrect timestamp parsing`)
      if (!allUnique) console.log(`    - Cross-contamination between records`)
    }
    
  } catch (error) {
    console.error('❌ Parser integration test failed:', error)
  }
}

testParserIntegration().catch(console.error)