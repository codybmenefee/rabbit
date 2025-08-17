#!/usr/bin/env node

/**
 * Simple isolated test of timestamp extraction
 */

async function testTimestampExtraction() {
  console.log('🧪 Simple Timestamp Extraction Test\n')
  
  try {
    const module = await import('./lib/resilient-timestamp-extractor.ts')
    const extractTimestamp = module.extractTimestamp || module.default?.extractTimestamp
    
    if (!extractTimestamp) {
      console.log('Available exports:', Object.keys(module))
      throw new Error('extractTimestamp function not found')
    }
    
    const testCases = [
      'Aug 11, 2025, 10:30:00 PM CDT',
      'Aug 10, 2025, 8:15:00 PM CDT', 
      'Jul 25, 2025, 6:45:00 PM CDT',
      'Jun 20, 2025, 2:00:00 PM CDT'
    ]
    
    const results = []
    
    for (let i = 0; i < testCases.length; i++) {
      const text = `Watched Video ${i + 1} ${testCases[i]}`
      const html = `Watched Video ${i + 1}<br>${testCases[i]}`
      
      console.log(`Test ${i + 1}: ${text}`)
      
      const result = extractTimestamp(text, html, {
        debug: false,
        minConfidence: 70
      })
      
      console.log(`  Raw: ${result.rawTimestamp}`)
      console.log(`  Parsed: ${result.timestamp}`)
      console.log(`  Strategy: ${result.strategy}`)
      console.log(`  Confidence: ${result.confidence}%`)
      console.log('')
      
      results.push(result.timestamp)
    }
    
    // Check for uniqueness
    const uniqueResults = new Set(results.filter(r => r !== null))
    console.log(`📊 Results: ${results.length} total, ${uniqueResults.size} unique`)
    
    if (uniqueResults.size === results.filter(r => r !== null).length) {
      console.log('✅ All timestamps are unique!')
    } else {
      console.log('❌ Duplicate timestamps detected:')
      const counts = new Map()
      results.forEach(r => {
        if (r) counts.set(r, (counts.get(r) || 0) + 1)
      })
      counts.forEach((count, timestamp) => {
        if (count > 1) {
          console.log(`  ${timestamp}: ${count} times`)
        }
      })
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testTimestampExtraction()