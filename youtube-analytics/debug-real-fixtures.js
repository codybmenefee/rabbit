// Debug with real HTML fixtures to identify cross-contamination source
const fs = require('fs')
const path = require('path')
const { YouTubeHistoryParserCore } = require('./lib/parser-core.ts')

async function debugWithRealFixtures() {
  console.log('🔍 DEBUGGING WITH REAL HTML FIXTURES\n')
  
  const parser = new YouTubeHistoryParserCore()
  
  // Test with the current dates sample
  const samplePath = path.join(__dirname, 'tests/fixtures/current-dates-sample.html')
  const sampleHTML = fs.readFileSync(samplePath, 'utf8')
  
  console.log('📄 Testing with current-dates-sample.html...\n')
  
  try {
    const records = await parser.parseHTML(sampleHTML)
    
    console.log(`📊 Parse Results: ${records.length} records found\n`)
    
    // Log each record with detailed timestamp info
    records.forEach((record, i) => {
      console.log(`Record ${i + 1}:`)
      console.log(`  ID: ${record.id}`)
      console.log(`  Title: ${record.videoTitle}`)
      console.log(`  Channel: ${record.channelTitle}`)
      console.log(`  watchedAt: ${record.watchedAt}`)
      console.log(`  rawTimestamp: "${record.rawTimestamp}"`)
      console.log(`  Year: ${record.year}, Month: ${record.month}`)
      console.log(`  Product: ${record.product}`)
      console.log('  ---')
    })
    
    // Analyze timestamp uniqueness
    const timestampCounts = {}
    const rawTimestampCounts = {}
    
    records.forEach(record => {
      if (record.watchedAt) {
        timestampCounts[record.watchedAt] = (timestampCounts[record.watchedAt] || 0) + 1
      }
      if (record.rawTimestamp) {
        rawTimestampCounts[record.rawTimestamp] = (rawTimestampCounts[record.rawTimestamp] || 0) + 1
      }
    })
    
    console.log(`\n📈 TIMESTAMP ANALYSIS:`)
    console.log(`Total records: ${records.length}`)
    console.log(`Records with timestamps: ${records.filter(r => r.watchedAt).length}`)
    console.log(`Unique parsed timestamps: ${Object.keys(timestampCounts).length}`)
    console.log(`Unique raw timestamps: ${Object.keys(rawTimestampCounts).length}`)
    
    console.log(`\nParsed timestamp distribution:`)
    Object.entries(timestampCounts).forEach(([timestamp, count]) => {
      console.log(`  ${timestamp}: ${count} records`)
    })
    
    console.log(`\nRaw timestamp distribution:`)
    Object.entries(rawTimestampCounts).forEach(([rawTimestamp, count]) => {
      console.log(`  "${rawTimestamp}": ${count} records`)
    })
    
    // Check if we have cross-contamination
    const duplicateTimestamps = Object.entries(timestampCounts).filter(([, count]) => count > 1)
    const duplicateRawTimestamps = Object.entries(rawTimestampCounts).filter(([, count]) => count > 1)
    
    if (duplicateTimestamps.length > 0) {
      console.log(`\n⚠️  CROSS-CONTAMINATION DETECTED:`)
      duplicateTimestamps.forEach(([timestamp, count]) => {
        console.log(`  Timestamp "${timestamp}" appears in ${count} records`)
        
        // Show which records have this timestamp
        const affectedRecords = records.filter(r => r.watchedAt === timestamp)
        console.log(`  Affected records:`)
        affectedRecords.forEach((record, i) => {
          console.log(`    ${i + 1}. "${record.videoTitle}" - raw: "${record.rawTimestamp}"`)
        })
      })
    } else {
      console.log(`\n✅ NO CROSS-CONTAMINATION: All parsed timestamps are unique`)
    }
    
    if (duplicateRawTimestamps.length > 0) {
      console.log(`\n⚠️  RAW TIMESTAMP DUPLICATION:`)
      duplicateRawTimestamps.forEach(([rawTimestamp, count]) => {
        console.log(`  Raw timestamp "${rawTimestamp}" appears in ${count} records`)
      })
    } else {
      console.log(`\n✅ RAW TIMESTAMPS UNIQUE: All raw timestamps are unique`)
    }
    
  } catch (error) {
    console.error('❌ Parser error:', error)
  }
}

debugWithRealFixtures().catch(console.error)