/**
 * Check Migration Data Script
 * 
 * Quickly check if stored data has rawTimestamp fields that can be migrated
 * or if re-upload is necessary.
 */

import { createHistoricalStorage } from '../lib/historical-storage'

async function checkMigrationData() {
  // This would be run with a specific user ID
  const userId = process.env.USER_ID || '109984293356459236541' // Replace with actual user ID
  
  console.log('🔍 Checking stored data for migration possibilities...')
  console.log(`📋 User ID: ${userId}`)
  
  try {
    const storage = createHistoricalStorage(userId)
    
    // Get a sample of records
    const records = await storage.queryTimeSlice({})
    
    console.log(`📊 Total records: ${records.length}`)
    
    if (records.length === 0) {
      console.log('❌ No records found')
      return
    }
    
    // Analyze first 10 records
    const sampleSize = Math.min(10, records.length)
    const sample = records.slice(0, sampleSize)
    
    console.log(`🔍 Analyzing sample of ${sampleSize} records:`)
    
    let withTimestamp = 0
    let withRawTimestamp = 0
    let withBoth = 0
    let withNeither = 0
    
    sample.forEach((record, i) => {
      const hasTimestamp = !!record.watchedAt
      const hasRawTimestamp = !!record.rawTimestamp
      
      console.log(`Record ${i + 1}:`)
      console.log(`  ID: ${record.id}`)
      console.log(`  watchedAt: ${record.watchedAt || 'null'}`)
      console.log(`  rawTimestamp: ${record.rawTimestamp || 'null'}`)
      console.log(`  videoTitle: ${record.videoTitle?.substring(0, 50)}...`)
      console.log('')
      
      if (hasTimestamp && hasRawTimestamp) withBoth++
      else if (hasTimestamp) withTimestamp++
      else if (hasRawTimestamp) withRawTimestamp++
      else withNeither++
    })
    
    console.log('📈 Sample Statistics:')
    console.log(`  Records with timestamp only: ${withTimestamp}`)
    console.log(`  Records with raw timestamp only: ${withRawTimestamp}`)
    console.log(`  Records with both: ${withBoth}`)
    console.log(`  Records with neither: ${withNeither}`)
    
    // Overall analysis
    const totalWithRaw = records.filter(r => r.rawTimestamp).length
    const totalWithParsed = records.filter(r => r.watchedAt).length
    
    console.log('\n📊 Full Dataset Analysis:')
    console.log(`  Total records: ${records.length}`)
    console.log(`  Records with parsed timestamps: ${totalWithParsed}`)
    console.log(`  Records with raw timestamps: ${totalWithRaw}`)
    
    if (totalWithRaw > 0 && totalWithParsed === 0) {
      console.log('\n✅ MIGRATION POSSIBLE:')
      console.log(`  Can migrate ${totalWithRaw} records using stored rawTimestamp data`)
      console.log('  Recommendation: Use migration tool')
    } else if (totalWithRaw === 0) {
      console.log('\n❌ MIGRATION NOT POSSIBLE:')
      console.log('  No rawTimestamp data available')
      console.log('  Recommendation: Re-upload the original watch-history.html file')
    } else {
      console.log('\n⚠️  MIXED STATE:')
      console.log('  Some records have timestamps, some have raw data')
      console.log('  Recommendation: Check specific use case')
    }
    
  } catch (error) {
    console.error('❌ Error checking migration data:', error)
  }
}

// Run if called directly
if (require.main === module) {
  checkMigrationData().catch(console.error)
}

export { checkMigrationData }