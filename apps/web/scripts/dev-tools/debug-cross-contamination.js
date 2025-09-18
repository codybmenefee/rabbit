#!/usr/bin/env node

/**
 * Debug script to investigate cross-contamination issue
 */

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

console.log('🔍 DEBUGGING CROSS-CONTAMINATION ISSUE\n')

// Test 1: Check DOM parsing
console.log('=== Test 1: DOM Parsing ===')
try {
  const { JSDOM } = require('jsdom')
  const dom = new JSDOM(testHTML)
  const doc = dom.window.document
  
  const contentCells = doc.querySelectorAll('.content-cell')
  console.log(`Found ${contentCells.length} content cells`)
  
  contentCells.forEach((cell, i) => {
    const textContent = cell.textContent || ''
    const innerHTML = cell.innerHTML || ''
    
    console.log(`\nCell ${i + 1}:`)
    console.log(`Text: ${textContent.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim()}`)
    console.log(`HTML: ${innerHTML.replace(/\n|\r/g, ' ').replace(/\s+/g, ' ').trim()}`)
    
    // Extract timestamp from this cell only
    const timestampMatch = textContent.match(/(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/)
    if (timestampMatch) {
      console.log(`Found timestamp: ${timestampMatch[1]}`)
    } else {
      console.log('No timestamp found')
    }
  })
  
} catch (error) {
  console.log('DOM parsing not available, skipping...')
}

// Test 2: Test timestamp extractor isolation
console.log('\n=== Test 2: Timestamp Extractor Isolation ===')

async function testExtractorIsolation() {
  try {
    const { extractTimestamp, resetTimestampExtractionStats } = await import('./lib/resilient-timestamp-extractor.ts')
    
    resetTimestampExtractionStats()
    
    const testCases = [
      {
        text: 'Watched Video 1 Aug 11, 2025, 10:30:00 PM CDT',
        html: 'Watched Video 1<br>Aug 11, 2025, 10:30:00 PM CDT',
        expected: '2025-08-12T03:30:00.000Z'
      },
      {
        text: 'Watched Video 2 Aug 10, 2025, 8:15:00 PM CDT',
        html: 'Watched Video 2<br>Aug 10, 2025, 8:15:00 PM CDT',
        expected: '2025-08-11T01:15:00.000Z'
      },
      {
        text: 'Watched Video 3 Jul 25, 2025, 6:45:00 PM CDT',
        html: 'Watched Video 3<br>Jul 25, 2025, 6:45:00 PM CDT',
        expected: '2025-07-26T00:45:00.000Z'
      },
      {
        text: 'Watched Video 4 Jun 20, 2025, 2:00:00 PM CDT',
        html: 'Watched Video 4<br>Jun 20, 2025, 2:00:00 PM CDT',
        expected: '2025-06-20T19:00:00.000Z'
      }
    ]
    
    const results = []
    
    for (const testCase of testCases) {
      console.log(`\nTesting: ${testCase.text.substring(0, 50)}...`)
      
      const result = extractTimestamp(testCase.text, testCase.html, {
        debug: false,
        minConfidence: 70
      })
      
      results.push({
        input: testCase.text.substring(0, 30),
        expected: testCase.expected,
        actual: result.timestamp,
        raw: result.rawTimestamp,
        strategy: result.strategy,
        confidence: result.confidence
      })
      
      console.log(`  Expected: ${testCase.expected}`)
      console.log(`  Actual: ${result.timestamp}`)
      console.log(`  Raw: ${result.rawTimestamp}`)
      console.log(`  Strategy: ${result.strategy}`)
      console.log(`  Confidence: ${result.confidence}%`)
      
      // Check if result matches expected (allowing timezone tolerance)
      if (result.timestamp && testCase.expected) {
        const actualDate = new Date(result.timestamp)
        const expectedDate = new Date(testCase.expected)
        const diffHours = Math.abs(actualDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60)
        
        if (diffHours < 24) {
          console.log('  ✅ MATCH')
        } else {
          console.log('  ❌ MISMATCH')
        }
      } else {
        console.log('  ❌ EXTRACTION FAILED')
      }
    }
    
    // Check for duplicates
    console.log('\n📊 Duplicate Analysis:')
    const timestamps = results.map(r => r.actual).filter(t => t !== null)
    const uniqueTimestamps = new Set(timestamps)
    
    console.log(`Total timestamps: ${timestamps.length}`)
    console.log(`Unique timestamps: ${uniqueTimestamps.size}`)
    
    if (uniqueTimestamps.size < timestamps.length) {
      console.log('❌ DUPLICATES DETECTED!')
      
      const duplicates = new Map()
      timestamps.forEach(t => {
        duplicates.set(t, (duplicates.get(t) || 0) + 1)
      })
      
      for (const [timestamp, count] of duplicates.entries()) {
        if (count > 1) {
          console.log(`  ${timestamp}: ${count} occurrences`)
        }
      }
    } else {
      console.log('✅ NO DUPLICATES DETECTED')
    }
    
  } catch (error) {
    console.log('❌ Timestamp extractor test failed:', error.message)
  }
}

// Test 3: Test regex patterns directly
console.log('\n=== Test 3: Regex Pattern Testing ===')

function testRegexPatterns() {
  const testStrings = [
    'Watched Video 1 Aug 11, 2025, 10:30:00 PM CDT',
    'Watched Video 2 Aug 10, 2025, 8:15:00 PM CDT',
    'Watched Video 3 Jul 25, 2025, 6:45:00 PM CDT',
    'Watched Video 4 Jun 20, 2025, 2:00:00 PM CDT'
  ]
  
  const pattern = /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/
  
  testStrings.forEach((str, i) => {
    console.log(`\nString ${i + 1}: ${str}`)
    
    const match = str.match(pattern)
    if (match) {
      console.log(`  Found: ${match[1]}`)
    } else {
      console.log('  No match found')
    }
  })
}

// Run all tests
async function runAllTests() {
  testRegexPatterns()
  await testExtractorIsolation()
  
  console.log('\n🎯 CONCLUSION:')
  console.log('If duplicates are detected in Test 2, the issue is in the timestamp extractor.')
  console.log('If no duplicates in Test 2 but duplicates in parser integration, the issue is in parser logic.')
}

runAllTests().catch(console.error)