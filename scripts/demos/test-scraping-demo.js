#!/usr/bin/env node

/**
 * YouTube Scraping Service Demo Script
 * 
 * This script demonstrates how to test the YouTube scraping service
 * and compare its performance with the YouTube API service.
 */

const path = require('path');

// Load environment variables from root directory
require('../../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../../.env') });

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Test video IDs for demonstration
const TEST_VIDEOS = [
  'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  'kJQP7kiw5Fk', // Luis Fonsi - Despacito
  '9bZkp7q19f0', // PSY - Gangnam Style
  'fJ9rUzIMcZQ', // Queen - Bohemian Rhapsody
  'hT_nvWreIhg'  // Alan Walker - Faded
];

/**
 * Make HTTP request helper
 */
async function makeRequest(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Test scraping service health
 */
async function testHealth() {
  console.log('🏥 Testing Scraping Service Health...');
  
  const result = await makeRequest(`${API_BASE_URL}/api/scraping/health`);
  
  if (result.success) {
    console.log('✅ Scraping service is healthy');
    console.log(`   Status: ${result.data.data.status}`);
    console.log(`   Success Rate: ${result.data.data.successRate}%`);
    console.log(`   Circuit Breaker: ${result.data.data.circuitBreakerOpen ? 'OPEN' : 'CLOSED'}`);
  } else {
    console.log('❌ Scraping service health check failed');
    console.log(`   Error: ${result.error || result.data?.error}`);
  }
  console.log('');
}

/**
 * Test video ID extraction
 */
async function testVideoIdExtraction() {
  console.log('🔍 Testing Video ID Extraction...');
  
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/embed/dQw4w9WgXcQ'
  ];
  
  for (const url of testUrls) {
    const result = await makeRequest(`${API_BASE_URL}/api/scraping/extract-video-id`, {
      method: 'POST',
      body: JSON.stringify({ url })
    });
    
    if (result.success) {
      console.log(`✅ ${url} → ${result.data.data.videoId}`);
    } else {
      console.log(`❌ Failed to extract from ${url}`);
    }
  }
  console.log('');
}

/**
 * Test single video scraping
 */
async function testVideoScraping() {
  console.log('🎥 Testing Video Scraping...');
  
  const videoId = TEST_VIDEOS[0]; // Rick Astley
  console.log(`   Testing with video ID: ${videoId}`);
  
  const startTime = Date.now();
  const result = await makeRequest(`${API_BASE_URL}/api/scraping/test/${videoId}`);
  const duration = Date.now() - startTime;
  
  if (result.success) {
    const data = result.data.data;
    console.log('✅ Scraping successful!');
    console.log(`   Title: ${data.scrapedData.title}`);
    console.log(`   Channel: ${data.scrapedData.channelName}`);
    console.log(`   Duration: ${data.scrapedData.duration} seconds`);
    console.log(`   Views: ${data.scrapedData.viewCount?.toLocaleString() || 'N/A'}`);
    console.log(`   Fields Extracted: ${data.metadata.fieldsExtracted}`);
    console.log(`   Scraping Time: ${duration}ms`);
  } else {
    console.log('❌ Scraping failed');
    console.log(`   Error: ${result.error || result.data?.error}`);
  }
  console.log('');
}

/**
 * Test service statistics
 */
async function testStatistics() {
  console.log('📊 Getting Service Statistics...');
  
  const result = await makeRequest(`${API_BASE_URL}/api/scraping/stats`);
  
  if (result.success) {
    const stats = result.data.data;
    console.log('✅ Statistics retrieved:');
    console.log(`   Total Requests: ${stats.requestCount}`);
    console.log(`   Success Count: ${stats.successCount}`);
    console.log(`   Error Count: ${stats.errorCount}`);
    console.log(`   Success Rate: ${stats.successRate.toFixed(1)}%`);
    console.log(`   Cache Hit Rate: ${stats.cacheHitRate?.toFixed(1) || 'N/A'}%`);
    console.log(`   Circuit Breaker: ${stats.circuitBreakerOpen ? 'OPEN' : 'CLOSED'}`);
  } else {
    console.log('❌ Failed to get statistics');
    console.log(`   Error: ${result.error || result.data?.error}`);
  }
  console.log('');
}

/**
 * Performance test with multiple videos
 */
async function performanceTest() {
  console.log('🚀 Running Performance Test...');
  console.log(`   Testing with ${TEST_VIDEOS.length} videos...`);
  
  const startTime = Date.now();
  const results = [];
  
  // Test videos sequentially to respect rate limits
  for (let i = 0; i < TEST_VIDEOS.length; i++) {
    const videoId = TEST_VIDEOS[i];
    console.log(`   Testing video ${i + 1}/${TEST_VIDEOS.length}: ${videoId}`);
    
    const videoStartTime = Date.now();
    const result = await makeRequest(`${API_BASE_URL}/api/scraping/test/${videoId}`);
    const videoDuration = Date.now() - videoStartTime;
    
    results.push({
      videoId,
      success: result.success,
      duration: videoDuration,
      fieldsExtracted: result.success ? result.data.data.metadata.fieldsExtracted : 0
    });
    
    // Respect rate limiting - wait 2 seconds between requests
    if (i < TEST_VIDEOS.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  const totalDuration = Date.now() - startTime;
  const successCount = results.filter(r => r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const avgFields = results.filter(r => r.success).reduce((sum, r) => sum + r.fieldsExtracted, 0) / successCount;
  
  console.log('📈 Performance Results:');
  console.log(`   Success Rate: ${successCount}/${TEST_VIDEOS.length} (${(successCount / TEST_VIDEOS.length * 100).toFixed(1)}%)`);
  console.log(`   Average Request Time: ${avgDuration.toFixed(0)}ms`);
  console.log(`   Average Fields Extracted: ${avgFields.toFixed(1)}`);
  console.log(`   Total Test Time: ${(totalDuration / 1000).toFixed(1)}s`);
  console.log(`   Videos Per Hour: ${(3600 / (totalDuration / 1000) * TEST_VIDEOS.length).toFixed(0)}`);
  console.log('');
}

/**
 * Test cache functionality
 */
async function testCache() {
  console.log('💾 Testing Cache Functionality...');
  
  const videoId = TEST_VIDEOS[0];
  
  // First request (should hit the network)
  console.log('   Making first request (should miss cache)...');
  const start1 = Date.now();
  const result1 = await makeRequest(`${API_BASE_URL}/api/scraping/test/${videoId}`);
  const duration1 = Date.now() - start1;
  
  // Second request (should hit cache)
  console.log('   Making second request (should hit cache)...');
  const start2 = Date.now();
  const result2 = await makeRequest(`${API_BASE_URL}/api/scraping/test/${videoId}`);
  const duration2 = Date.now() - start2;
  
  if (result1.success && result2.success) {
    console.log('✅ Cache test results:');
    console.log(`   First request: ${duration1}ms`);
    console.log(`   Second request: ${duration2}ms`);
    console.log(`   Speed improvement: ${(duration1 / duration2).toFixed(1)}x`);
    console.log(`   Cache likely ${duration2 < duration1 / 2 ? 'HIT' : 'MISS'} on second request`);
  } else {
    console.log('❌ Cache test failed - requests unsuccessful');
  }
  console.log('');
}

/**
 * Main demo function
 */
async function runDemo() {
  console.log('🚀 YouTube Scraping Service Demo');
  console.log('================================\n');
  
  // Check if fetch is available (Node.js 18+)
  if (typeof fetch === 'undefined') {
    console.log('❌ This demo requires Node.js 18+ with fetch support');
    console.log('   Please upgrade Node.js or install a fetch polyfill');
    process.exit(1);
  }
  
  try {
    // Run all tests
    await testHealth();
    await testVideoIdExtraction();
    await testVideoScraping();
    await testStatistics();
    await testCache();
    await performanceTest();
    
    // Final statistics
    await testStatistics();
    
    console.log('✅ Demo completed successfully!');
    console.log('\n📖 For more information, see:');
    console.log('   - Documentation: docs/scraping-service-guide.md');
    console.log('   - API Reference: http://localhost:5000/api/scraping/');
    console.log('   - Health Check: http://localhost:5000/api/scraping/health');
    
  } catch (error) {
    console.error('❌ Demo failed with error:', error.message);
    process.exit(1);
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  runDemo();
}

module.exports = {
  runDemo,
  testHealth,
  testVideoScraping,
  testStatistics,
  performanceTest
};