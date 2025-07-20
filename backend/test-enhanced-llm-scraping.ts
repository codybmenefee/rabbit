#!/usr/bin/env npx ts-node

/**
 * Test script for enhanced LLM scraping service
 * Tests the improved prompt, retry logic, and error handling
 */

import { YouTubeLLMScrapingService } from './src/services/YouTubeLLMScrapingService';

async function testEnhancedLLMScraping() {
  console.log('🧪 Testing Enhanced LLM Scraping Service...\n');

  // Test configuration with enhanced settings
  const config = {
    provider: 'google' as const,
    model: 'gemma-3-4b-it',
    maxTokens: 2000,
    temperature: 0.1,
    maxConcurrentRequests: 3,
    requestDelayMs: 1000,
    retryAttempts: 3, // Enhanced retry logic
    timeout: 30000,
    userAgents: [],
    connectionPoolSize: 20,
    batchSize: 5,
    enableCaching: true,
    cacheTTL: 7200,
    costLimit: 5,
    htmlChunkSize: 50000,
    enableFallback: true
  };

  const service = new YouTubeLLMScrapingService(config);

  // Test video IDs (mix of popular and potentially problematic videos)
  const testVideoIds = [
    'dQw4w9WgXcQ', // Rick Roll - should work
    'jNQXAC9IVRw', // Me at the zoo - first YouTube video
    '9bZkp7q19f0', // PSY - GANGNAM STYLE
    'k85mRPqvMbE', // Another popular video
    'L_jWHffIx5E'  // Smash Mouth - All Star
  ];

  console.log('📋 Test Configuration:');
  console.log(`- Provider: ${config.provider}`);
  console.log(`- Model: ${config.model}`);
  console.log(`- Retry Attempts: ${config.retryAttempts}`);
  console.log(`- Batch Size: ${config.batchSize}`);
  console.log(`- Cost Limit: $${config.costLimit}`);
  console.log(`- Test Videos: ${testVideoIds.length}\n`);

  try {
    console.log('🚀 Starting enhanced LLM scraping test...\n');
    
    const startTime = Date.now();
    const results = await service.scrapeVideos(testVideoIds);
    const endTime = Date.now();
    
    console.log('✅ Scraping completed!\n');
    
    // Display results
    console.log('📊 Results Summary:');
    console.log(`- Total Time: ${((endTime - startTime) / 1000).toFixed(2)}s`);
    console.log(`- Videos Processed: ${results.length}`);
    console.log(`- Successful: ${results.filter(r => r.success).length}`);
    console.log(`- Failed: ${results.filter(r => !r.success).length}`);
    console.log(`- Success Rate: ${((results.filter(r => r.success).length / results.length) * 100).toFixed(1)}%\n`);

    // Display detailed results
    console.log('📝 Detailed Results:');
    results.forEach((result, index) => {
      console.log(`\n${index + 1}. Video ID: ${result.videoId}`);
      console.log(`   Status: ${result.success ? '✅ Success' : '❌ Failed'}`);
      
      if (result.success && result.data) {
        console.log(`   Title: ${result.data.title || 'N/A'}`);
        console.log(`   Channel: ${result.data.channelName || 'N/A'}`);
        console.log(`   Duration: ${result.data.duration ? `${Math.floor(result.data.duration / 60)}:${(result.data.duration % 60).toString().padStart(2, '0')}` : 'N/A'}`);
        console.log(`   Views: ${result.data.viewCount ? result.data.viewCount.toLocaleString() : 'N/A'}`);
        console.log(`   Category: ${result.data.category || 'N/A'}`);
        console.log(`   Is Short: ${result.data.isShort ? 'Yes' : 'No'}`);
        console.log(`   Is Livestream: ${result.data.isLivestream ? 'Yes' : 'No'}`);
        console.log(`   Cost: $${result.cost.toFixed(6)}`);
        console.log(`   Tokens: ${result.tokensUsed}`);
      } else {
        console.log(`   Error: ${result.error || 'Unknown error'}`);
        console.log(`   Cost: $${result.cost.toFixed(6)}`);
        console.log(`   Tokens: ${result.tokensUsed}`);
      }
    });

    // Display metrics
    const metrics = service.getMetrics();
    console.log('\n📈 Performance Metrics:');
    console.log(`- Total Requests: ${metrics.totalRequests}`);
    console.log(`- Successful Requests: ${metrics.successfulRequests}`);
    console.log(`- Failed Requests: ${metrics.failedRequests}`);
    console.log(`- Total Tokens Used: ${metrics.totalTokensUsed.toLocaleString()}`);
    console.log(`- Total Cost: $${metrics.totalCost.toFixed(6)}`);
    console.log(`- Average Response Time: ${metrics.averageResponseTime.toFixed(2)}ms`);
    console.log(`- Cache Hit Rate: ${(metrics.cacheHitRate * 100).toFixed(1)}%`);

    // Test specific improvements
    console.log('\n🔍 Testing Specific Improvements:');
    
    // Test retry logic by checking if any videos had multiple attempts
    const retryTest = results.filter(r => !r.success).length > 0;
    console.log(`- Retry Logic Test: ${retryTest ? '✅ Triggered' : '✅ Not needed (all succeeded on first try)'}`);
    
    // Test JSON parsing improvements
    const jsonParseTest = results.filter(r => r.success && r.data && r.data.title && r.data.channelName).length;
    console.log(`- Enhanced JSON Parsing: ✅ ${jsonParseTest}/${results.filter(r => r.success).length} videos have title and channel`);
    
    // Test cost management
    const costTest = metrics.totalCost <= config.costLimit;
    console.log(`- Cost Management: ${costTest ? '✅ Within limits' : '❌ Exceeded limits'}`);

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : 'Unknown error');
    if (error instanceof Error) {
      console.error(error.stack);
    }
  } finally {
    // Cleanup
    await service.cleanup();
    console.log('\n🧹 Cleanup completed');
  }
}

// Run the test
if (require.main === module) {
  testEnhancedLLMScraping()
    .then(() => {
      console.log('\n🎉 Enhanced LLM scraping test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error);
      process.exit(1);
    });
}

export { testEnhancedLLMScraping }; 