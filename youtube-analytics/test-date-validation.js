#!/usr/bin/env node

/**
 * Test date validation specifically
 */

async function testDateValidation() {
  console.log('🗓️ Testing Date Validation\n')
  
  try {
    const module = await import('./lib/resilient-timestamp-extractor.ts')
    const extractTimestamp = module.extractTimestamp || module.default?.extractTimestamp
    
    if (!extractTimestamp) {
      console.log('Available exports:', Object.keys(module))
      throw new Error('extractTimestamp function not found')
    }
    
    const testCases = [
      {
        name: 'Valid 2025 Date',
        text: 'Aug 11, 2025, 10:30:00 PM CDT',
        shouldPass: true
      },
      {
        name: 'Year 2000 (Before YouTube)',
        text: 'Jan 1, 2000, 12:00:00 AM EST',
        shouldPass: false
      },
      {
        name: 'Year 2004 (Before YouTube)',
        text: 'Dec 31, 2004, 11:59:59 PM EST',
        shouldPass: false
      },
      {
        name: 'Year 2005 (YouTube Founded)',
        text: 'Feb 14, 2005, 10:30:00 PM EST',
        shouldPass: true
      },
      {
        name: 'Future Date 2030',
        text: 'Dec 31, 2030, 11:59:59 PM UTC',
        shouldPass: false
      },
      {
        name: 'Future Date 2027 (Too Far)',
        text: 'Jan 1, 2027, 12:00:00 AM UTC',
        shouldPass: false
      },
      {
        name: 'Next Year (Should Pass)',
        text: `Jan 1, ${new Date().getFullYear() + 1}, 12:00:00 AM UTC`,
        shouldPass: true
      }
    ]
    
    for (const testCase of testCases) {
      console.log(`Testing: ${testCase.name}`)
      console.log(`Input: ${testCase.text}`)
      
      const result = extractTimestamp(testCase.text, testCase.text, {
        debug: false,
        minConfidence: 0 // Test all extractions regardless of confidence
      })
      
      const passed = testCase.shouldPass ? result.timestamp !== null : result.timestamp === null
      
      console.log(`Expected: ${testCase.shouldPass ? 'PASS' : 'FAIL'}`)
      console.log(`Result: ${result.timestamp}`)
      console.log(`Raw: ${result.rawTimestamp}`)
      console.log(`Strategy: ${result.strategy}`)
      console.log(`Confidence: ${result.confidence}%`)
      console.log(`Test: ${passed ? '✅ CORRECT' : '❌ INCORRECT'}`)
      
      if (result.quality) {
        console.log(`Date Reasonable: ${result.quality.dateReasonable}`)
      }
      
      console.log('')
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testDateValidation()