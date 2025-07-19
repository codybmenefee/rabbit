/**
 * LLM Scraping Service Demo
 * Tests the new LLM-enhanced YouTube scraping functionality
 */

const fetch = require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Sample YouTube video IDs for testing
const SAMPLE_VIDEO_IDS = [
  'dQw4w9WgXcQ', // Rick Roll (classic)
  'L_jWHffIx5E', // Smash Mouth - All Star
  'ZZ5LpwO-An4', // HEYYEYAAEYAAAEYAEYAA
  'fJ9rUzIMcZQ', // Queen - Bohemian Rhapsody
  'kXYiU_JCYtU'  // Linkin Park - Numb
];

class LLMScrapingDemo {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async makeRequest(endpoint, method = 'GET', body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      console.log(`🔄 ${method} ${url}`);
      if (body) {
        console.log('📤 Request body:', JSON.stringify(body, null, 2));
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.message || 'Request failed'}`);
      }

      return data;
    } catch (error) {
      console.error(`❌ Request failed:`, error.message);
      throw error;
    }
  }

  async testHealthCheck() {
    console.log('\n=== 🏥 Health Check ===');
    try {
      const result = await this.makeRequest('/api/llm-scraping/health');
      console.log('✅ Health check passed');
      console.log('📊 Service status:', result.data || result);
      return true;
    } catch (error) {
      console.log('❌ Health check failed - service may not be available');
      return false;
    }
  }

  async testCostEstimation() {
    console.log('\n=== 💰 Cost Estimation ===');
    try {
      const result = await this.makeRequest('/api/llm-scraping/estimate-cost', 'POST', {
        videoCount: SAMPLE_VIDEO_IDS.length,
        provider: 'anthropic'
      });
      
      console.log('✅ Cost estimation successful');
      console.log('💵 Estimated cost:', result.data.estimates);
      return result.data.estimates;
    } catch (error) {
      console.log('❌ Cost estimation failed');
      return null;
    }
  }

  async testConfiguration() {
    console.log('\n=== ⚙️  Configuration ===');
    try {
      const result = await this.makeRequest('/api/llm-scraping/config');
      console.log('✅ Configuration retrieved');
      console.log('🔧 Available providers:', result.data.providers);
      console.log('🧠 Available models:', JSON.stringify(result.data.models, null, 2));
      console.log('💡 Recommendations:', result.data.recommendations);
      return result.data;
    } catch (error) {
      console.log('❌ Configuration retrieval failed');
      return null;
    }
  }

  async testBasicScraping() {
    console.log('\n=== 🔍 Basic LLM Scraping Test ===');
    try {
      // Test with first 2 videos to keep costs low
      const testVideoIds = SAMPLE_VIDEO_IDS.slice(0, 2);
      
      console.log(`🎯 Testing with ${testVideoIds.length} videos:`, testVideoIds);
      
      const result = await this.makeRequest('/api/llm-scraping/scrape', 'POST', {
        videoIds: testVideoIds
      });
      
      console.log('✅ Basic scraping successful');
      console.log('📈 Summary:', result.data.summary);
      
      if (result.data.results && result.data.results.length > 0) {
        console.log('\n📋 Sample results:');
        result.data.results.forEach((video, index) => {
          console.log(`\n${index + 1}. Video ID: ${video.videoId}`);
          if (video.success && video.data) {
            console.log(`   Title: ${video.data.title || 'N/A'}`);
            console.log(`   Channel: ${video.data.channelName || 'N/A'}`);
            console.log(`   Views: ${video.data.viewCount || 'N/A'}`);
            console.log(`   Duration: ${video.data.duration || 'N/A'} seconds`);
            console.log(`   Cost: $${video.cost.toFixed(4)}`);
            console.log(`   Tokens: ${video.tokensUsed}`);
          } else {
            console.log(`   ❌ Failed: ${video.error}`);
          }
        });
      }
      
      return result.data;
    } catch (error) {
      console.log('❌ Basic scraping failed');
      return null;
    }
  }

  async testBatchScraping() {
    console.log('\n=== 📦 Batch Scraping Test ===');
    try {
      const result = await this.makeRequest('/api/llm-scraping/batch-scrape', 'POST', {
        videoIds: SAMPLE_VIDEO_IDS,
        batchSize: 2,
        costLimit: 0.50, // $0.50 limit
        provider: 'anthropic'
      });
      
      console.log('✅ Batch scraping successful');
      console.log('📈 Summary:', result.data.summary);
      
      const successfulVideos = result.data.results.filter(r => r.success);
      console.log(`\n🎯 Successfully processed ${successfulVideos.length} videos`);
      
      if (result.data.summary.costLimitReached) {
        console.log('💰 Cost limit was reached during processing');
      }
      
      return result.data;
    } catch (error) {
      console.log('❌ Batch scraping failed');
      return null;
    }
  }

  async testMetrics() {
    console.log('\n=== 📊 Metrics Test ===');
    try {
      const result = await this.makeRequest('/api/llm-scraping/metrics');
      console.log('✅ Metrics retrieved');
      console.log('📈 Current metrics:', result.data.metrics);
      return result.data.metrics;
    } catch (error) {
      console.log('❌ Metrics retrieval failed');
      return null;
    }
  }

  async runFullDemo() {
    console.log('🚀 Starting LLM Scraping Service Demo');
    console.log('=' .repeat(50));

    const results = {
      healthCheck: false,
      configuration: null,
      costEstimation: null,
      basicScraping: null,
      batchScraping: null,
      metrics: null
    };

    // 1. Health Check
    results.healthCheck = await this.testHealthCheck();
    if (!results.healthCheck) {
      console.log('\n⚠️  Service not available. Make sure:');
      console.log('   - Backend server is running (npm run dev)');
      console.log('   - LLM_SCRAPING_ENABLED=true in .env');
      console.log('   - ANTHROPIC_API_KEY or OPENAI_API_KEY is set');
      return results;
    }

    // 2. Configuration
    results.configuration = await this.testConfiguration();

    // 3. Cost Estimation
    results.costEstimation = await this.testCostEstimation();

    // 4. Basic Scraping (small test)
    results.basicScraping = await this.testBasicScraping();

    // 5. Batch Scraping (with cost limits)
    results.batchScraping = await this.testBatchScraping();

    // 6. Metrics
    results.metrics = await this.testMetrics();

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Demo completed!');
    console.log('=' .repeat(50));

    if (results.basicScraping || results.batchScraping) {
      const totalCost = (results.basicScraping?.summary?.totalCost || 0) + 
                       (results.batchScraping?.summary?.totalCost || 0);
      console.log(`💰 Total cost for demo: $${totalCost.toFixed(4)}`);
    }

    return results;
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  const demo = new LLMScrapingDemo();
  demo.runFullDemo()
    .then(() => {
      console.log('\n✅ Demo finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Demo failed:', error);
      process.exit(1);
    });
}

module.exports = LLMScrapingDemo;