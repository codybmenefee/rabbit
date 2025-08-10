import { readFileSync } from 'fs'
import { YouTubeHistoryParser } from './parser'

// Simple test script to validate parser functionality
export async function testParser() {
  try {
    console.log('🧪 Testing YouTube History Parser...')
    
    const parser = new YouTubeHistoryParser()
    
    // Test with sample file
    const samplePath = './watch-history.sample.html'
    let content: string
    
    try {
      content = readFileSync(samplePath, 'utf-8')
    } catch (error) {
      console.error('❌ Could not read sample file:', error)
      return
    }

    const records = parser.parseHTML(content)
    console.log(`✅ Parsed ${records.length} records`)

    if (records.length === 0) {
      console.warn('⚠️  No records found - check HTML structure')
      return
    }

    // Sample some records for inspection
    const sampleRecord = records[0]
    console.log('\n📋 Sample record:')
    console.log(JSON.stringify(sampleRecord, null, 2))

    // Generate summary
    const summary = parser.generateSummary(records)
    console.log('\n📊 Import summary:')
    console.log(`  Total records: ${summary.totalRecords}`)
    console.log(`  Unique channels: ${summary.uniqueChannels}`)
    console.log(`  YouTube: ${summary.productBreakdown.youtube}`)
    console.log(`  YouTube Music: ${summary.productBreakdown.youtubeMusic}`)
    console.log(`  Date range: ${summary.dateRange.start?.toDateString()} - ${summary.dateRange.end?.toDateString()}`)

    // Check for common issues
    const recordsWithoutTimestamps = records.filter(r => !r.watchedAt)
    const recordsWithoutVideos = records.filter(r => !r.videoTitle && !r.videoUrl)
    
    console.log('\n🔍 Data quality:')
    console.log(`  Records without timestamps: ${recordsWithoutTimestamps.length}`)
    console.log(`  Records without video info: ${recordsWithoutVideos.length}`)

    // Show some topic distributions
    const allTopics = records.flatMap(r => r.topics)
    const topicCounts = allTopics.reduce((acc, topic) => {
      acc[topic] = (acc[topic] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('\n🏷️  Topic distribution:')
    Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([topic, count]) => {
        console.log(`  ${topic}: ${count}`)
      })

    console.log('\n✅ Parser test completed successfully!')
    return { records, summary }

  } catch (error) {
    console.error('❌ Parser test failed:', error)
    throw error
  }
}

// Run test if this file is executed directly
if (require.main === module) {
  testParser()
}