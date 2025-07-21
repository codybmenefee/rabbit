#!/usr/bin/env node

/**
 * OpenRouter LLM Scraping Demo
 * 
 * This script demonstrates the OpenRouter-powered LLM scraping service
 * that provides unified access to multiple AI models for YouTube metadata extraction.
 */

const BASE_URL = 'http://localhost:5000/api/llm-scraping';

// Test video IDs (popular YouTube videos)
const TEST_VIDEO_IDS = [
  'dQw4w9WgXcQ', // Rick Astley - Never Gonna Give You Up
  'L_jWHffIx5E', // History of the entire world, i guess
  'ZZ5LpwO-An4', // Gangnam Style
  'fJ9rUzIMcZQ', // Despacito
  'kXYiU_JCYtU'  // Baby Shark
];

async function makeRequest(endpoint, options = {}) {
  const fetch = (await import('node-fetch')).default;
  
  const url = `${BASE_URL}${endpoint}`;
  const defaultOptions = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const response = await fetch(url, { ...defaultOptions, ...options });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return response.json();
}

async function testHealthCheck() {
  console.log('\n🏥 Testing OpenRouter Service Health...');
  console.log('=' .repeat(50));
  
  try {
    const health = await makeRequest('/health');
    console.log('✅ Service Status:', health.status);
    console.log('📊 Current Metrics:');
    console.log(`   • Total Requests: ${health.metrics.totalRequests}`);
    console.log(`   • Total Cost: $${health.metrics.totalCost.toFixed(6)}`);
    console.log(`   • Cache Hit Rate: ${health.metrics.cacheHitRate}%`);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testConfiguration() {
  console.log('\n🔧 Testing OpenRouter Configuration...');
  console.log('=' .repeat(50));
  
  try {
    const config = await makeRequest('/config');
    console.log('✅ Available Providers:', config.data.providers.join(', '));
    console.log('📋 Model Options:');
    
    Object.entries(config.data.models).forEach(([provider, models]) => {
      console.log(`   • ${provider}: ${models.join(', ')}`);
    });
    
    console.log('💰 Pricing Information:');
    Object.entries(config.data.pricing).forEach(([provider, models]) => {
      Object.entries(models).forEach(([model, pricing]) => {
        console.log(`   • ${model}: ${pricing.input} / ${pricing.output}`);
      });
    });
    
    return true;
  } catch (error) {
    console.error('❌ Configuration check failed:', error.message);
    return false;
  }
}

async function testCostEstimation() {
  console.log('\n💵 Testing Cost Estimation...');
  console.log('=' .repeat(50));
  
  try {
    const estimates = await Promise.all([
      makeRequest('/estimate-cost', {
        method: 'POST',
        body: JSON.stringify({
          videoCount: 10,
          provider: 'anthropic'
        })
      }),
      makeRequest('/estimate-cost', {
        method: 'POST',
        body: JSON.stringify({
          videoCount: 100,
          provider: 'openai'
        })
      })
    ]);
    
    estimates.forEach((estimate, index) => {
      const provider = index === 0 ? 'Anthropic' : 'OpenAI';
      const videoCount = index === 0 ? 10 : 100;
      
      console.log(`✅ ${provider} Cost Estimate (${videoCount} videos):`);
      console.log(`   • Estimated Cost: $${estimate.data.estimatedCost.toFixed(4)}`);
      console.log(`   • Cost Per Video: $${estimate.data.costPerVideo.toFixed(6)}`);
      console.log(`   • Model: ${estimate.data.model}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Cost estimation failed:', error.message);
    return false;
  }
}

async function testBatchScraping() {
  console.log('\n🤖 Testing OpenRouter Batch Scraping...');
  console.log('=' .repeat(50));
  
  try {
    // Test with small batch
    console.log('📝 Scraping 2 videos with Anthropic...');
    const smallBatch = await makeRequest('/batch-scrape', {
      method: 'POST',
      body: JSON.stringify({
        videoIds: TEST_VIDEO_IDS.slice(0, 2),
        batchSize: 2,
        costLimit: 0.1,
        provider: 'anthropic'
      })
    });
    
    console.log(`✅ Small Batch Results:`);
    console.log(`   • Success Rate: ${smallBatch.data.summary.successRate}%`);
    console.log(`   • Total Cost: $${smallBatch.data.summary.totalCost.toFixed(6)}`);
    console.log(`   • Average Cost/Video: $${smallBatch.data.summary.averageCostPerVideo.toFixed(6)}`);
    console.log(`   • Total Tokens: ${smallBatch.data.summary.totalTokensUsed || 'N/A'}`);
    
    // Show sample results
    const successfulResults = smallBatch.data.results.filter(r => r.success);
    if (successfulResults.length > 0) {
      const sample = successfulResults[0];
      console.log(`\n📄 Sample Extracted Data (${sample.videoId}):`);
      console.log(`   • Title: ${sample.data.title}`);
      console.log(`   • Channel: ${sample.data.channelName}`);
      console.log(`   • Views: ${sample.data.viewCount?.toLocaleString() || 'N/A'}`);
      console.log(`   • Duration: ${sample.data.duration || 'N/A'} seconds`);
      console.log(`   • Provider: ${sample.provider}`);
      console.log(`   • Model: ${sample.model}`);
    }
    
    // Test with larger batch and different provider
    console.log('\n📝 Scraping 3 videos with OpenAI fallback...');
    const largeBatch = await makeRequest('/batch-scrape', {
      method: 'POST',
      body: JSON.stringify({
        videoIds: TEST_VIDEO_IDS.slice(2, 5),
        batchSize: 3,
        costLimit: 0.2,
        provider: 'openai'
      })
    });
    
    console.log(`✅ Large Batch Results:`);
    console.log(`   • Success Rate: ${largeBatch.data.summary.successRate}%`);
    console.log(`   • Total Cost: $${largeBatch.data.summary.totalCost.toFixed(6)}`);
    console.log(`   • Average Cost/Video: $${largeBatch.data.summary.averageCostPerVideo.toFixed(6)}`);
    
    return true;
  } catch (error) {
    console.error('❌ Batch scraping failed:', error.message);
    return false;
  }
}

async function testMetrics() {
  console.log('\n📊 Testing Final Metrics...');
  console.log('=' .repeat(50));
  
  try {
    const metrics = await makeRequest('/metrics');
    console.log('✅ Service Metrics:');
    console.log(`   • Total Requests: ${metrics.data.totalRequests}`);
    console.log(`   • Success Rate: ${metrics.data.successRate}%`);
    console.log(`   • Total Cost: $${metrics.data.totalCost.toFixed(6)}`);
    console.log(`   • Total Tokens: ${metrics.data.totalTokensUsed}`);
    console.log(`   • Average Response Time: ${metrics.data.averageResponseTime}ms`);
    console.log(`   • Cache Hit Rate: ${metrics.data.cacheHitRate}%`);
    
    return true;
  } catch (error) {
    console.error('❌ Metrics check failed:', error.message);
    return false;
  }
}

async function runDemo() {
  console.log('\n🚀 OpenRouter LLM Scraping Service Demo');
  console.log('=' .repeat(60));
  console.log('This demo tests the unified LLM API via OpenRouter');
  console.log('Supports: Anthropic, OpenAI, Meta, Google, Mistral models');
  console.log('=' .repeat(60));
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Configuration', fn: testConfiguration },
    { name: 'Cost Estimation', fn: testCostEstimation },
    { name: 'Batch Scraping', fn: testBatchScraping },
    { name: 'Final Metrics', fn: testMetrics }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const success = await test.fn();
      if (success) {
        passed++;
        console.log(`\n✅ ${test.name} - PASSED`);
      } else {
        failed++;
        console.log(`\n❌ ${test.name} - FAILED`);
      }
    } catch (error) {
      failed++;
      console.log(`\n❌ ${test.name} - ERROR: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`🏁 Demo Complete: ${passed} passed, ${failed} failed`);
  
  if (passed === tests.length) {
    console.log('\n🎉 All tests passed! OpenRouter integration is working perfectly.');
    console.log('\n📚 Next Steps:');
    console.log('   • Add your real OpenRouter API key to enable live LLM calls');
    console.log('   • Configure your preferred models and cost limits');
    console.log('   • Process your full YouTube dataset with confidence');
    console.log('\n💡 OpenRouter Benefits:');
    console.log('   • Single API for multiple LLM providers');
    console.log('   • Automatic model routing and fallback');
    console.log('   • Built-in cost tracking and optimization');
    console.log('   • Access to latest models from all major providers');
  } else {
    console.log('\n⚠️  Some tests failed. Check the server logs for more details.');
  }
  
  console.log('\n🔗 Useful Endpoints:');
  console.log(`   • Health: GET ${BASE_URL}/health`);
  console.log(`   • Config: GET ${BASE_URL}/config`);
  console.log(`   • Scrape: POST ${BASE_URL}/batch-scrape`);
  console.log(`   • Metrics: GET ${BASE_URL}/metrics`);
  console.log('=' .repeat(60));
}

// Run the demo
runDemo().catch(console.error); 