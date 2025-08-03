const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TARGET_VIDEOS_PER_SECOND = 1000;
const TARGET_TOTAL_VIDEOS = 10000;
const TARGET_TIME_SECONDS = 10;

// Test video IDs (popular videos for consistent results)
const TEST_VIDEO_IDS = [
  'dQw4w9WgXcQ', 'kJQP7kiw5Fk', '9bZkp7q19f0', 'fJ9rUzIMcZQ', 'hT_nvWreIhg',
  'pRpeEdMmmQ0', 'YQHsXMglC9A', 'WPni755-Krg', '2Vv-BfVoq4g', 'JGwWNGJdvx8',
  'K4DyBUG242c', 'jNQXAC9IVRw', 'e-ORhEE9VVg', 'tgbNymZ7vqY', 'GHMjD0Lp5DY',
  'wZZ7oFKsKzY', 'L_jWHffIx5E', 'SlPhMPnQ58k', '5qap5aO4i9A', 'S-sJp1FfG7Q'
];

/**
 * Generate video IDs for testing
 */
function generateTestVideoIds(count) {
  const videoIds = [];
  for (let i = 0; i < count; i++) {
    videoIds.push(TEST_VIDEO_IDS[i % TEST_VIDEO_IDS.length]);
  }
  return videoIds;
}

/**
 * Format time duration
 */
function formatTime(milliseconds) {
  if (milliseconds < 1000) return `${milliseconds}ms`;
  const seconds = (milliseconds / 1000).toFixed(1);
  return `${seconds}s`;
}

/**
 * Format throughput rate
 */
function formatThroughput(videosPerSecond) {
  return `${videosPerSecond.toFixed(2)} videos/sec`;
}

/**
 * Calculate performance statistics
 */
function calculatePerformanceStats(results, totalTime) {
  const successCount = results.filter(r => r.success).length;
  const failCount = results.length - successCount;
  const successRate = (successCount / results.length) * 100;
  const videosPerSecond = results.length / (totalTime / 1000);
  const averageTimePerVideo = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  
  return {
    totalVideos: results.length,
    successCount,
    failCount,
    successRate,
    videosPerSecond,
    averageTimePerVideo,
    totalTime,
    estimatedHourlyCapacity: Math.round(videosPerSecond * 3600)
  };
}

/**
 * Test high-performance service health
 */
async function testHealthCheck() {
  console.log('🏥 Testing High-Performance Service Health...');
  try {
    const response = await axios.get(`${BASE_URL}/api/hp-scraping/health`);
    const data = response.data;
    
    if (data.success) {
      console.log(`✅ Service Status: ${data.data.status}`);
      console.log(`   Success Rate: ${data.data.health.successRate}`);
      console.log(`   Memory Usage: ${data.data.health.memoryUsage}`);
      console.log(`   Current Throughput: ${data.data.health.currentThroughput}`);
      console.log(`   Worker Utilization: ${data.data.health.workerUtilization}`);
      return true;
    } else {
      console.log(`❌ Service unhealthy: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Health check failed: ${error.message}`);
    return false;
  }
}

/**
 * Test service capabilities
 */
async function testCapabilities() {
  console.log('\n📋 Checking Service Capabilities...');
  try {
    const response = await axios.get(`${BASE_URL}/api/hp-scraping/capabilities`);
    const data = response.data.data;
    
    console.log('✅ Capabilities:');
    console.log(`   Max Concurrent Requests: ${data.capabilities.maxConcurrentRequests}`);
    console.log(`   Max Batch Size: ${data.capabilities.maxBatchSize.toLocaleString()}`);
    console.log(`   Estimated Throughput: ${data.capabilities.estimatedThroughput}`);
    console.log(`   Worker Threads: ${data.capabilities.workerThreads ? 'Enabled' : 'Disabled'}`);
    console.log(`   Connection Pooling: ${data.capabilities.connectionPooling ? 'Enabled' : 'Disabled'}`);
    console.log(`   Intelligent Caching: ${data.capabilities.intelligentCaching ? 'Enabled' : 'Disabled'}`);
    console.log(`   Deduplication: ${data.capabilities.deduplication ? 'Enabled' : 'Disabled'}`);
    
    return data;
  } catch (error) {
    console.log(`❌ Failed to get capabilities: ${error.message}`);
    return null;
  }
}

/**
 * Run progressive performance tests
 */
async function runProgressiveTests() {
  console.log('\n🚀 Running Progressive Performance Tests...');
  
  const testSizes = [10, 50, 100, 500, 1000];
  const results = [];
  
  for (const size of testSizes) {
    console.log(`\n   Testing with ${size} videos...`);
    
    const videoIds = generateTestVideoIds(size);
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${BASE_URL}/api/hp-scraping/batch`, {
        videoIds,
        options: {
          enableDeduplication: true,
          enableFastParsing: true,
          maxConcurrency: 500
        }
      });
      
      const totalTime = Date.now() - startTime;
      const stats = calculatePerformanceStats(response.data.data.results, totalTime);
      
      console.log(`   ✅ Completed in ${formatTime(totalTime)}`);
      console.log(`   Success Rate: ${stats.successRate.toFixed(1)}%`);
      console.log(`   Throughput: ${formatThroughput(stats.videosPerSecond)}`);
      console.log(`   Avg Time/Video: ${stats.averageTimePerVideo.toFixed(0)}ms`);
      
      results.push({
        size,
        ...stats,
        meetsTarget: stats.videosPerSecond >= TARGET_VIDEOS_PER_SECOND
      });
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      results.push({
        size,
        error: error.message,
        meetsTarget: false
      });
    }
  }
  
  return results;
}

/**
 * Run the ultimate 10,000 videos challenge
 */
async function runUltimateChallenge() {
  console.log('\n🎯 ULTIMATE CHALLENGE: 10,000 Videos in 10 Seconds');
  console.log('='.repeat(60));
  
  const videoIds = generateTestVideoIds(TARGET_TOTAL_VIDEOS);
  console.log(`📊 Generated ${TARGET_TOTAL_VIDEOS.toLocaleString()} test video IDs`);
  console.log(`🎯 Target: ${TARGET_VIDEOS_PER_SECOND} videos/sec (${TARGET_TIME_SECONDS}s total)`);
  
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting high-performance batch scraping...');
    
    const response = await axios.post(`${BASE_URL}/api/hp-scraping/batch`, {
      videoIds,
      options: {
        enableDeduplication: true,
        enableFastParsing: true,
        maxConcurrency: 500
      }
    }, {
      timeout: 120000 // 2 minute timeout
    });
    
    const totalTime = Date.now() - startTime;
    const stats = calculatePerformanceStats(response.data.data.results, totalTime);
    
    console.log('\n📈 ULTIMATE CHALLENGE RESULTS:');
    console.log('='.repeat(60));
    console.log(`Total Videos: ${stats.totalVideos.toLocaleString()}`);
    console.log(`Successful: ${stats.successCount.toLocaleString()} (${stats.successRate.toFixed(1)}%)`);
    console.log(`Failed: ${stats.failCount.toLocaleString()}`);
    console.log(`Total Time: ${formatTime(stats.totalTime)}`);
    console.log(`Throughput: ${formatThroughput(stats.videosPerSecond)}`);
    console.log(`Avg Time/Video: ${stats.averageTimePerVideo.toFixed(0)}ms`);
    console.log(`Hourly Capacity: ${stats.estimatedHourlyCapacity.toLocaleString()} videos/hour`);
    
    // Target analysis
    const targetAchieved = stats.videosPerSecond >= TARGET_VIDEOS_PER_SECOND;
    const timeForTarget = (TARGET_TOTAL_VIDEOS / stats.videosPerSecond).toFixed(1);
    const performanceRatio = stats.videosPerSecond / TARGET_VIDEOS_PER_SECOND;
    
    console.log('\n🎯 TARGET ANALYSIS:');
    console.log(`Target Achieved: ${targetAchieved ? '✅ YES' : '❌ NO'}`);
    console.log(`Time for 10,000 videos: ${timeForTarget}s (target: ${TARGET_TIME_SECONDS}s)`);
    console.log(`Performance Ratio: ${performanceRatio.toFixed(2)}x`);
    
    if (targetAchieved) {
      console.log('🏆 CONGRATULATIONS! Target exceeded!');
      console.log(`🚀 Can process ${(stats.videosPerSecond * TARGET_TIME_SECONDS).toFixed(0)} videos in ${TARGET_TIME_SECONDS} seconds`);
    } else {
      const improvement = (TARGET_VIDEOS_PER_SECOND / stats.videosPerSecond).toFixed(1);
      console.log(`📊 Need ${improvement}x improvement to meet target`);
      
      if (performanceRatio >= 0.8) {
        console.log('🔥 Very close to target! Minor optimizations needed.');
      } else if (performanceRatio >= 0.5) {
        console.log('⚡ Good performance! Moderate optimizations needed.');
      } else {
        console.log('🔧 Significant optimizations needed.');
      }
    }
    
    return stats;
    
  } catch (error) {
    console.log(`\n❌ ULTIMATE CHALLENGE FAILED: ${error.message}`);
    
    if (error.code === 'ECONNABORTED') {
      console.log('⏱️  Request timed out - this might indicate the challenge is too large');
    } else if (error.response?.status === 400) {
      console.log('📝 Bad request - check batch size limits');
    } else if (error.response?.status === 429) {
      console.log('🚫 Rate limited - too many requests');
    }
    
    return null;
  }
}

/**
 * Performance analysis and recommendations
 */
function analyzePerformance(progressiveResults, ultimateResult) {
  console.log('\n📊 PERFORMANCE ANALYSIS');
  console.log('='.repeat(60));
  
  if (progressiveResults.length > 0) {
    console.log('Progressive Test Results:');
    progressiveResults.forEach(result => {
      if (!result.error) {
        const status = result.meetsTarget ? '✅' : '⚠️';
        console.log(`  ${status} ${result.size} videos: ${formatThroughput(result.videosPerSecond)}`);
      }
    });
    
    // Find scalability pattern
    const validResults = progressiveResults.filter(r => !r.error);
    if (validResults.length >= 2) {
      const smallTest = validResults[0];
      const largeTest = validResults[validResults.length - 1];
      const scalability = largeTest.videosPerSecond / smallTest.videosPerSecond;
      
      console.log(`\n📈 Scalability Factor: ${scalability.toFixed(2)}x`);
      if (scalability > 0.8) {
        console.log('✅ Excellent scalability - performance maintained at scale');
      } else if (scalability > 0.5) {
        console.log('⚡ Good scalability - minor performance degradation');
      } else {
        console.log('🔧 Poor scalability - significant performance degradation');
      }
    }
  }
  
  if (ultimateResult) {
    console.log('\nRecommendations:');
    
    if (ultimateResult.videosPerSecond >= TARGET_VIDEOS_PER_SECOND) {
      console.log('🏆 System exceeds performance targets!');
      console.log('💡 Consider even larger batch sizes for stress testing');
    } else {
      console.log('🔧 Optimization opportunities:');
      
      if (ultimateResult.successRate < 95) {
        console.log('  - Improve error handling and retry logic');
      }
      
      if (ultimateResult.averageTimePerVideo > 100) {
        console.log('  - Optimize parsing algorithms');
      }
      
      if (ultimateResult.videosPerSecond < TARGET_VIDEOS_PER_SECOND * 0.5) {
        console.log('  - Increase concurrency limits');
        console.log('  - Add more worker threads');
        console.log('  - Optimize connection pooling');
      }
    }
  }
}

/**
 * Main test execution
 */
async function runHighPerformanceDemo() {
  console.log('🚀 YouTube High-Performance Scraping Service Demo');
  console.log('='.repeat(60));
  console.log(`Target: ${TARGET_TOTAL_VIDEOS.toLocaleString()} videos in ${TARGET_TIME_SECONDS} seconds`);
  console.log(`Required throughput: ${TARGET_VIDEOS_PER_SECOND} videos/sec`);
  console.log('');
  
  // Check if service is healthy
  const isHealthy = await testHealthCheck();
  if (!isHealthy) {
    console.log('\n❌ Service is not healthy. Aborting tests.');
    return;
  }
  
  // Get service capabilities
  const capabilities = await testCapabilities();
  if (!capabilities) {
    console.log('\n⚠️  Could not retrieve capabilities, continuing anyway...');
  }
  
  // Run progressive tests
  const progressiveResults = await runProgressiveTests();
  
  // Ask user confirmation for ultimate challenge
  console.log('\n⚠️  Ready to run the ULTIMATE CHALLENGE?');
  console.log(`This will attempt to scrape ${TARGET_TOTAL_VIDEOS.toLocaleString()} videos at maximum performance.`);
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Run ultimate challenge
  const ultimateResult = await runUltimateChallenge();
  
  // Performance analysis
  analyzePerformance(progressiveResults, ultimateResult);
  
  console.log('\n✅ High-Performance Demo completed!');
  console.log('\n📖 For more information:');
  console.log('   - Performance metrics: GET /api/hp-scraping/performance');
  console.log('   - Run benchmark: GET /api/hp-scraping/benchmark?testSize=1000&concurrency=500');
  console.log('   - Health check: GET /api/hp-scraping/health');
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Run the demo
if (require.main === module) {
  runHighPerformanceDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}

module.exports = {
  runHighPerformanceDemo,
  generateTestVideoIds,
  calculatePerformanceStats
}; 