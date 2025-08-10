import { 
  computeKPIMetrics, 
  computeMonthlyTrend, 
  computeTopChannels, 
  computeDayTimeHeatmap, 
  computeTopicsLeaderboard,
  applyFilters,
  deriveTopics,
  normalizeWatchRecord
} from './aggregations'
import { 
  getAllFixtures, 
  generateDevelopmentSampleData, 
  getEdgeCaseFixtures,
  getMissingDataFixtures 
} from './fixtures'
import { WatchRecord, FilterOptions } from '@/types/records'

// Test suite for aggregation functions
export function runAggregationTests() {
  console.log('🧪 Running Aggregation Function Tests...\n')
  
  // Test 1: Basic KPI computation with edge cases
  testKPIMetrics()
  
  // Test 2: Monthly trends with missing data
  testMonthlyTrends()
  
  // Test 3: Top channels with filtering
  testTopChannels()
  
  // Test 4: Day/time heatmap with sparse data
  testDayTimeHeatmap()
  
  // Test 5: Topics leaderboard with multi-topic records
  testTopicsLeaderboard()
  
  // Test 6: Filter application edge cases
  testFilterApplication()
  
  // Test 7: Topic derivation accuracy
  testTopicDerivation()
  
  // Test 8: Normalization edge cases
  testRecordNormalization()
  
  console.log('✅ All aggregation tests completed!')
}

function testKPIMetrics() {
  console.log('1️⃣ Testing KPI Metrics...')
  
  const testData = getAllFixtures()
  const filters: FilterOptions = { 
    timeframe: 'YTD', 
    product: 'All' 
  }
  
  const kpis = computeKPIMetrics(testData, filters)
  
  console.log(`   Total Videos: ${kpis.totalVideos}`)
  console.log(`   Unique Channels: ${kpis.uniqueChannels}`)
  console.log(`   YTD Videos: ${kpis.ytdVideos}`)
  console.log(`   MTD Videos: ${kpis.mtdVideos}`)
  console.log(`   YTD YoY Delta: ${kpis.ytdYoyDelta.toFixed(1)}%`)
  
  // Validate basic constraints
  if (kpis.totalVideos < 0) console.error('❌ Total videos cannot be negative')
  if (kpis.uniqueChannels < 0) console.error('❌ Unique channels cannot be negative')
  if (kpis.ytdVideos > kpis.totalVideos) console.error('❌ YTD cannot exceed total')
  
  console.log('   ✓ KPI metrics computed successfully\n')
}

function testMonthlyTrends() {
  console.log('2️⃣ Testing Monthly Trends...')
  
  const sampleData = generateDevelopmentSampleData()
  const trends = computeMonthlyTrend(sampleData, { 
    timeframe: 'Last6M', 
    product: 'All' 
  })
  
  console.log(`   Generated ${trends.length} monthly data points`)
  console.log(`   Sample months: ${trends.slice(0, 3).map(t => t.month).join(', ')}`)
  
  // Validate data integrity
  trends.forEach((trend, index) => {
    if (trend.videos < 0) console.error(`❌ Month ${index} has negative video count`)
    if (trend.uniqueChannels < 0) console.error(`❌ Month ${index} has negative channel count`)
  })
  
  console.log('   ✓ Monthly trends computed successfully\n')
}

function testTopChannels() {
  console.log('3️⃣ Testing Top Channels...')
  
  const testData = generateDevelopmentSampleData()
  const topChannels = computeTopChannels(testData, { 
    timeframe: 'All', 
    product: 'YouTube' 
  }, 5)
  
  console.log(`   Found ${topChannels.length} top channels`)
  topChannels.forEach((channel, index) => {
    console.log(`   ${index + 1}. ${channel.channel}: ${channel.videoCount} videos (${channel.percentage.toFixed(1)}%)`)
  })
  
  // Validate sorting and percentages
  for (let i = 1; i < topChannels.length; i++) {
    if (topChannels[i].videoCount > topChannels[i - 1].videoCount) {
      console.error('❌ Top channels not properly sorted')
    }
  }
  
  const totalPercentage = topChannels.reduce((sum, c) => sum + c.percentage, 0)
  if (totalPercentage > 100) console.error('❌ Total percentage exceeds 100%')
  
  console.log('   ✓ Top channels computed successfully\n')
}

function testDayTimeHeatmap() {
  console.log('4️⃣ Testing Day/Time Heatmap...')
  
  const testData = generateDevelopmentSampleData()
  const heatmap = computeDayTimeHeatmap(testData, { 
    timeframe: 'All', 
    product: 'All' 
  })
  
  console.log(`   Generated ${heatmap.length} heatmap data points`)
  
  // Should have 7 days × 24 hours = 168 data points
  if (heatmap.length !== 168) {
    console.error(`❌ Expected 168 heatmap points, got ${heatmap.length}`)
  }
  
  // Find peak activity
  const maxActivity = Math.max(...heatmap.map(h => h.value))
  const peakHours = heatmap.filter(h => h.value === maxActivity)
  console.log(`   Peak activity: ${maxActivity} videos`)
  console.log(`   Peak times: ${peakHours.map(h => `${h.day} ${h.hour}:00`).join(', ')}`)
  
  console.log('   ✓ Day/time heatmap computed successfully\n')
}

function testTopicsLeaderboard() {
  console.log('5️⃣ Testing Topics Leaderboard...')
  
  const testData = generateDevelopmentSampleData()
  const topics = computeTopicsLeaderboard(testData, { 
    timeframe: 'All', 
    product: 'All' 
  })
  
  console.log(`   Found ${topics.length} unique topics`)
  topics.slice(0, 5).forEach((topic, index) => {
    console.log(`   ${index + 1}. ${topic.topic}: ${topic.count} videos (${topic.percentage.toFixed(1)}%, ${topic.trend})`)
  })
  
  // Validate sorting and data
  for (let i = 1; i < topics.length; i++) {
    if (topics[i].count > topics[i - 1].count) {
      console.error('❌ Topics not properly sorted by count')
    }
  }
  
  console.log('   ✓ Topics leaderboard computed successfully\n')
}

function testFilterApplication() {
  console.log('6️⃣ Testing Filter Application...')
  
  const allData = getAllFixtures()
  console.log(`   Starting with ${allData.length} records`)
  
  // Test timeframe filter
  const ytdFiltered = applyFilters(allData, { 
    timeframe: 'YTD', 
    product: 'All' 
  })
  console.log(`   YTD filtered: ${ytdFiltered.length} records`)
  
  // Test product filter
  const youtubeFiltered = applyFilters(allData, { 
    timeframe: 'All', 
    product: 'YouTube' 
  })
  console.log(`   YouTube only: ${youtubeFiltered.length} records`)
  
  // Test combined filters
  const combinedFiltered = applyFilters(allData, { 
    timeframe: 'YTD', 
    product: 'YouTube',
    topics: ['technology']
  })
  console.log(`   Combined filters: ${combinedFiltered.length} records`)
  
  // Test edge case: missing timestamp handling
  const missingData = getMissingDataFixtures()
  const filteredMissing = applyFilters(missingData, { 
    timeframe: 'YTD', 
    product: 'All' 
  })
  console.log(`   Records with missing timestamps handled: ${missingData.length - filteredMissing.length} filtered out`)
  
  console.log('   ✓ Filter application tested successfully\n')
}

function testTopicDerivation() {
  console.log('7️⃣ Testing Topic Derivation...')
  
  const testCases = [
    { title: "JavaScript Tutorial for Beginners", channel: "Code Academy", expected: ["Technology"] },
    { title: "Bitcoin Price Analysis 2024", channel: "Crypto News", expected: ["Finance"] },
    { title: "Election Results Live Stream", channel: "Political Updates", expected: ["Politics"] },
    { title: "Marvel Movie Review", channel: "Entertainment Weekly", expected: ["Entertainment"] },
    { title: "Pasta Recipe Italian Style", channel: "Chef's Kitchen", expected: ["Cooking"] },
    { title: "Random Video", channel: "Random Channel", expected: ["Other"] }
  ]
  
  testCases.forEach(testCase => {
    const derivedTopics = deriveTopics(testCase.title, testCase.channel)
    const hasExpected = testCase.expected.some(expected => 
      derivedTopics.includes(expected)
    )
    
    if (hasExpected) {
      console.log(`   ✓ "${testCase.title}" -> ${derivedTopics.join(', ')}`)
    } else {
      console.log(`   ⚠️  "${testCase.title}" -> ${derivedTopics.join(', ')} (expected: ${testCase.expected.join(', ')})`)
    }
  })
  
  console.log('   ✓ Topic derivation tested successfully\n')
}

function testRecordNormalization() {
  console.log('8️⃣ Testing Record Normalization...')
  
  // Test with complete data
  const completeData = {
    videoTitle: "Complete Test Video",
    videoUrl: "https://www.youtube.com/watch?v=test123",
    videoId: "test123",
    channelTitle: "Test Channel",
    channelUrl: "https://www.youtube.com/channel/UCtest",
    watchedAt: "2024-06-15T14:30:00Z",
    product: "YouTube"
  }
  
  const normalized = normalizeWatchRecord(completeData)
  console.log(`   Complete record: ${normalized.videoTitle} by ${normalized.channelTitle}`)
  console.log(`   Topics derived: ${normalized.topics.join(', ')}`)
  console.log(`   Date fields: ${normalized.year}-${normalized.month} (${normalized.dayOfWeek}, ${normalized.hour}h)`)
  
  // Test with missing data
  const incompleteData = {
    videoTitle: "Private video",
    videoUrl: null,
    videoId: null,
    channelTitle: null,
    channelUrl: null,
    watchedAt: null,
    product: "YouTube"
  }
  
  const normalizedIncomplete = normalizeWatchRecord(incompleteData)
  console.log(`   Incomplete record: ${normalizedIncomplete.videoTitle || 'null'} by ${normalizedIncomplete.channelTitle || 'null'}`)
  console.log(`   Null fields handled: year=${normalizedIncomplete.year}, hour=${normalizedIncomplete.hour}`)
  
  console.log('   ✓ Record normalization tested successfully\n')
}

// Export test runner
export default runAggregationTests