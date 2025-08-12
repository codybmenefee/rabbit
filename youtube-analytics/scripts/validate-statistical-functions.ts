/**
 * Statistical Functions Validation
 * 
 * This script specifically validates the mathematical accuracy of statistical
 * calculations used in the Analytics components, particularly percentile calculations.
 */

import { generateDemoData } from '../lib/demo-data'

// Test the percentile calculation function from StatisticalDeepDive
function getPercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0
  const index = Math.ceil(sortedArray.length * (1 - percentile)) - 1
  return sortedArray[Math.max(0, index)] || 0
}

// Correct percentile calculation for comparison
function getPercentileCorrect(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0
  
  // Standard percentile calculation
  const index = Math.floor(percentile * (sortedArray.length - 1))
  return sortedArray[index]
}

console.log('🧮 STATISTICAL FUNCTIONS VALIDATION')
console.log('=' + '='.repeat(50))

// Generate test data
const { records } = generateDemoData()
console.log(`📊 Using ${records.length} records for validation\n`)

// Test percentile calculations
const channelCounts = new Map<string, number>()
records.forEach(record => {
  if (record.channelTitle) {
    channelCounts.set(record.channelTitle, (channelCounts.get(record.channelTitle) || 0) + 1)
  }
})

const counts = Array.from(channelCounts.values()).sort((a, b) => b - a) // Descending order
console.log(`📈 Channel count distribution:`)
console.log(`   Total channels: ${counts.length}`)
console.log(`   Min videos per channel: ${Math.min(...counts)}`)
console.log(`   Max videos per channel: ${Math.max(...counts)}`)
console.log(`   Sample counts: [${counts.slice(0, 10).join(', ')}...]`)
console.log()

// Test percentile calculations
console.log('🔍 Testing Percentile Calculations:')

const percentilesToTest = [0.99, 0.95, 0.90, 0.75, 0.50, 0.25]

percentilesToTest.forEach(p => {
  const currentResult = getPercentile(counts, p)
  const correctResult = getPercentileCorrect(counts, p)
  
  const isCorrect = currentResult === correctResult
  const status = isCorrect ? '✅' : '❌'
  
  console.log(`${status} P${Math.round(p * 100)}: Current=${currentResult}, Expected=${correctResult}`)
  
  if (!isCorrect) {
    // Debug the calculation
    const currentIndex = Math.ceil(counts.length * (1 - p)) - 1
    const correctIndex = Math.floor(p * (counts.length - 1))
    console.log(`   🔍 Debug: Current uses index ${currentIndex}, Correct uses index ${correctIndex}`)
    console.log(`   🔍 Array length: ${counts.length}`)
    console.log(`   🔍 Current formula: ceil(${counts.length} * (1 - ${p})) - 1 = ${currentIndex}`)
    console.log(`   🔍 Correct formula: floor(${p} * (${counts.length} - 1)) = ${correctIndex}`)
  }
})

console.log()

// Test with a simple known array for verification
console.log('🧪 Testing with Known Array [10, 8, 6, 4, 2]:')
const testArray = [10, 8, 6, 4, 2] // Already sorted descending

percentilesToTest.forEach(p => {
  const currentResult = getPercentile(testArray, p)
  const correctResult = getPercentileCorrect(testArray, p)
  
  const isCorrect = currentResult === correctResult
  const status = isCorrect ? '✅' : '❌'
  
  console.log(`${status} P${Math.round(p * 100)}: Current=${currentResult}, Expected=${correctResult}`)
})

console.log()

// Test the impact of the percentile bug
console.log('📊 Impact Analysis:')

// Calculate how many percentiles are incorrect
let incorrectPercentiles = 0
let totalTests = 0

[0.99, 0.95, 0.90, 0.75, 0.50, 0.25, 0.10, 0.05, 0.01].forEach(p => {
  totalTests++
  const current = getPercentile(counts, p)
  const correct = getPercentileCorrect(counts, p)
  
  if (current !== correct) {
    incorrectPercentiles++
  }
})

console.log(`❌ Incorrect percentile calculations: ${incorrectPercentiles}/${totalTests}`)
console.log(`📈 Accuracy rate: ${((totalTests - incorrectPercentiles) / totalTests * 100).toFixed(1)}%`)

if (incorrectPercentiles > 0) {
  console.log('\n🚨 CRITICAL ISSUE DETECTED:')
  console.log('   The getPercentile function in StatisticalDeepDive uses incorrect logic.')
  console.log('   Current: ceil(length * (1 - percentile)) - 1')
  console.log('   Correct: floor(percentile * (length - 1))')
  console.log('\n💡 RECOMMENDED FIX:')
  console.log('   Replace the getPercentile function with:')
  console.log('   ```typescript')
  console.log('   function getPercentile(sortedArray: number[], percentile: number): number {')
  console.log('     if (sortedArray.length === 0) return 0')
  console.log('     // For descending order, use (1 - percentile) to get correct percentile')
  console.log('     const index = Math.floor((1 - percentile) * (sortedArray.length - 1))')
  console.log('     return sortedArray[index]')
  console.log('   }')
  console.log('   ```')
}

console.log('\n🔍 Additional Analysis:')
console.log('The current implementation appears to be trying to work with descending-sorted arrays,')
console.log('but uses an incorrect formula that can lead to wrong percentile values.')