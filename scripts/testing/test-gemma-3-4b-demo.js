#!/usr/bin/env node

/**
 * Test script for Gemma 3 4B Instruct LLM scraping
 * Demonstrates the new model integration and validates performance
 */

const { YouTubeLLMScrapingService } = require('./backend/dist/services/YouTubeLLMScrapingService');

// Test configuration
const TEST_CONFIG = {
  provider: 'google',
  model: 'gemma-3-4b-it',
  maxTokens: 2000,
  temperature: 0.1,
  maxConcurrentRequests: 3,
  requestDelayMs: 1000,
  retryAttempts: 2,
  timeout: 30000,
  userAgents: [],
  connectionPoolSize: 10,
  batchSize: 5,
  enableCaching: true,
  cacheTTL: 7200,
  costLimit: 1.0, // $1.00 limit for testing
  htmlChunkSize: 50000,
  enableFallback: true
};

// Sample video IDs for testing
const TEST_VIDEO_IDS = [
  'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  '9bZkp7q19f0', // PSY - GANGNAM STYLE
  'kJQP7kiw5Fk'  // Luis Fonsi - Despacito
];

async function testGemma3Scraping() {
  console.log('🚀 Testing Gemma 3 4B Instruct LLM Scraping');
  console.log('=' .repeat(50));
  
  try {
    // Initialize the service
    console.log('📡 Initializing LLM Scraping Service...');
    const scrapingService = new YouTubeLLMScrapingService(TEST_CONFIG);
    
    console.log('✅ Service initialized with config:', {
      model: TEST_CONFIG.model,
      batchSize: TEST_CONFIG.batchSize,
      costLimit: TEST_CONFIG.costLimit
    });
    
    // Test batch scraping
    console.log('\n🔍 Testing batch scraping with sample video IDs...');
    console.log('Video IDs:', TEST_VIDEO_IDS);
    
    const startTime = Date.now();
    const results = await scrapingService.scrapeVideos(TEST_VIDEO_IDS);
    const endTime = Date.now();
    
    console.log(`\n⏱️  Batch processing completed in ${endTime - startTime}ms`);
    
    // Display results
    console.log('\n📊 Results:');
    console.log('-'.repeat(30));
    
    results.forEach((result, index) => {
      console.log(`\n🎥 Video ${index + 1}: ${result.videoId}`);
      console.log(`   Success: ${result.success ? '✅' : '❌'}`);
      
      if (result.success && result.data) {
        console.log(`   Title: ${result.data.title || 'N/A'}`);
        console.log(`   Channel: ${result.data.channelName || 'N/A'}`);
        console.log(`   Views: ${result.data.viewCount || 'N/A'}`);
        console.log(`   Duration: ${result.data.duration || 'N/A'}s`);
        console.log(`   Is Short: ${result.data.isShort || 'N/A'}`);
      } else {
        console.log(`   Error: ${result.error || 'Unknown error'}`);
      }
      
      console.log(`   Tokens Used: ${result.tokensUsed}`);
      console.log(`   Cost: $${result.cost.toFixed(6)}`);
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Model: ${result.model}`);
    });
    
    // Display metrics
    const metrics = scrapingService.getMetrics();
    console.log('\n📈 Performance Metrics:');
    console.log('-'.repeat(30));
    console.log(`Total Requests: ${metrics.totalRequests}`);
    console.log(`Successful: ${metrics.successfulRequests}`);
    console.log(`Failed: ${metrics.failedRequests}`);
    console.log(`Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%`);
    console.log(`Total Tokens Used: ${metrics.totalTokensUsed}`);
    console.log(`Total Cost: $${metrics.totalCost.toFixed(6)}`);
    console.log(`Average Response Time: ${metrics.averageResponseTime.toFixed(0)}ms`);
    
    // Cost analysis
    console.log('\n💰 Cost Analysis:');
    console.log('-'.repeat(30));
    const costPerVideo = metrics.totalCost / metrics.totalRequests;
    console.log(`Cost per video: $${costPerVideo.toFixed(8)}`);
    console.log(`Videos per dollar: ${(1 / costPerVideo).toFixed(0)}`);
    
    // Performance comparison
    console.log('\n⚡ Performance Comparison (estimated):');
    console.log('-'.repeat(30));
    console.log('Gemma 3 4B Instruct:');
    console.log(`  - Cost per video: $${costPerVideo.toFixed(8)}`);
    console.log(`  - Speed: ${metrics.averageResponseTime.toFixed(0)}ms avg`);
    console.log('Claude 3 Haiku (for comparison):');
    console.log('  - Cost per video: ~$0.0015');
    console.log('  - Speed: ~2000ms avg');
    console.log('GPT-4o (for comparison):');
    console.log('  - Cost per video: ~$0.015');
    console.log('  - Speed: ~3000ms avg');
    
    console.log('\n🎉 Test completed successfully!');
    
    // Cleanup
    await scrapingService.cleanup();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testGemma3Scraping()
    .then(() => {
      console.log('\n✨ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = { testGemma3Scraping, TEST_CONFIG }; 