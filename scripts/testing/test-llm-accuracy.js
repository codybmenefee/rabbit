/**
 * LLM Scraping Accuracy Test
 * Tests the accuracy of LLM web scraping using test-watch-history-small.html
 * Collects video title, channel title, and category for all 5 videos using Gemma model
 */

const fs = require('fs');
const path = require('path');

// Load environment variables from root directory
require('../../backend/node_modules/dotenv').config({ path: path.join(__dirname, '../../.env') });

// Use built-in fetch if available, otherwise import node-fetch
const fetch = globalThis.fetch || require('node-fetch');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';

// Expected data from test-watch-history-small.html
const EXPECTED_DATA = [
  {
    videoId: 'dQw4w9WgXcQ',
    expectedTitle: 'Never Gonna Give You Up',
    expectedChannel: 'Rick Astley',
    expectedCategory: 'Music' // This will be determined by LLM
  },
  {
    videoId: 'jNQXAC9IVRw',
    expectedTitle: 'Me at the zoo',
    expectedChannel: 'jawed',
    expectedCategory: 'Entertainment' // This will be determined by LLM
  },
  {
    videoId: '9bZkp7q19f0',
    expectedTitle: 'Gangnam Style',
    expectedChannel: 'officialpsy',
    expectedCategory: 'Music' // This will be determined by LLM
  },
  {
    videoId: 'k85mRPqvMbE',
    expectedTitle: 'Chocolate Rain',
    expectedChannel: 'Tay Zonday',
    expectedCategory: 'Music' // This will be determined by LLM
  },
  {
    videoId: 'L_jWHffIx5E',
    expectedTitle: 'Smosh - Food Battle 2006',
    expectedChannel: 'Smosh',
    expectedCategory: 'Entertainment' // This will be determined by LLM
  }
];

class LLMAccuracyTest {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.results = [];
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
      const result = await this.makeRequest('/health');
      console.log('✅ Health check passed');
      console.log('📊 Service status:', result);
      return true;
    } catch (error) {
      console.log('❌ Health check failed - service may not be available');
      return false;
    }
  }

  async testLLMScrapingHealth() {
    console.log('\n=== 🧠 LLM Scraping Health Check ===');
    try {
      const result = await this.makeRequest('/api/llm-scraping/health');
      console.log('✅ LLM Scraping health check passed');
      console.log('📊 LLM Service status:', result.data || result);
      return true;
    } catch (error) {
      console.log('❌ LLM Scraping health check failed');
      return false;
    }
  }

  async testLLMConfiguration() {
    console.log('\n=== ⚙️ LLM Configuration Check ===');
    try {
      const result = await this.makeRequest('/api/llm-scraping/config');
      console.log('✅ LLM Configuration retrieved');
      console.log('🔧 Current provider:', result.data.provider);
      console.log('🧠 Current model:', result.data.model);
      console.log('💡 Model info:', result.data.modelInfo);
      
      // Check if Gemma model is being used
      if (result.data.model && result.data.model.includes('gemma')) {
        console.log('✅ Gemma model detected in configuration');
        return true;
      } else {
        console.log('⚠️ Gemma model not detected - current model:', result.data.model);
        return false;
      }
    } catch (error) {
      console.log('❌ LLM Configuration retrieval failed');
      return false;
    }
  }

  async testLLMScrapingAccuracy() {
    console.log('\n=== 🎯 LLM Scraping Accuracy Test ===');
    console.log('Testing accuracy of video title, channel title, and category extraction');
    console.log(`Testing ${EXPECTED_DATA.length} videos with Gemma model`);
    
    const videoIds = EXPECTED_DATA.map(item => item.videoId);
    
    try {
      console.log('\n📋 Video IDs to test:', videoIds);
      
      const result = await this.makeRequest('/api/llm-scraping/scrape', 'POST', {
        videoIds: videoIds,
        provider: 'google',
        model: 'gemma-3-4b-it'
      });
      
      console.log('✅ LLM Scraping completed');
      console.log('📈 Summary:', result.data.summary);
      
      // Analyze results for accuracy
      await this.analyzeAccuracy(result.data.results);
      
      return result.data;
    } catch (error) {
      console.log('❌ LLM Scraping failed');
      console.error('Error details:', error.message);
      return null;
    }
  }

  async analyzeAccuracy(scrapedResults) {
    console.log('\n=== 📊 Accuracy Analysis ===');
    
    let totalTests = 0;
    let titleMatches = 0;
    let channelMatches = 0;
    let categoryExtracted = 0;
    let successfulScrapes = 0;

    for (let i = 0; i < EXPECTED_DATA.length; i++) {
      const expected = EXPECTED_DATA[i];
      const scraped = scrapedResults.find(r => r.videoId === expected.videoId);
      
      console.log(`\n🎬 Video ${i + 1}: ${expected.videoId}`);
      console.log(`   Expected Title: "${expected.expectedTitle}"`);
      console.log(`   Expected Channel: "${expected.expectedChannel}"`);
      
      if (scraped && scraped.success && scraped.data) {
        successfulScrapes++;
        const data = scraped.data;
        
        console.log(`   ✅ Scraped successfully`);
        console.log(`   📝 Scraped Title: "${data.title || 'N/A'}"`);
        console.log(`   👤 Scraped Channel: "${data.channelName || 'N/A'}"`);
        console.log(`   🏷️ Scraped Category: "${data.category || 'N/A'}"`);
        console.log(`   💰 Cost: $${scraped.cost?.toFixed(4) || 'N/A'}`);
        console.log(`   🧠 Tokens Used: ${scraped.tokensUsed || 'N/A'}`);
        console.log(`   🤖 Provider: ${scraped.provider || 'N/A'}`);
        console.log(`   🧠 Model: ${scraped.model || 'N/A'}`);
        
        // Check title accuracy
        if (data.title && this.isTitleMatch(data.title, expected.expectedTitle)) {
          titleMatches++;
          console.log(`   ✅ Title MATCH`);
        } else {
          console.log(`   ❌ Title MISMATCH`);
        }
        
        // Check channel accuracy
        if (data.channelName && this.isChannelMatch(data.channelName, expected.expectedChannel)) {
          channelMatches++;
          console.log(`   ✅ Channel MATCH`);
        } else {
          console.log(`   ❌ Channel MISMATCH`);
        }
        
        // Check if category was extracted
        if (data.category && data.category !== 'N/A' && data.category !== 'Unknown') {
          categoryExtracted++;
          console.log(`   ✅ Category EXTRACTED`);
        } else {
          console.log(`   ❌ Category NOT EXTRACTED`);
        }
        
        totalTests++;
        
      } else {
        console.log(`   ❌ Failed to scrape`);
        if (scraped && scraped.error) {
          console.log(`   🔍 Error: ${scraped.error}`);
        }
      }
    }
    
    // Calculate accuracy metrics
    const titleAccuracy = totalTests > 0 ? (titleMatches / totalTests * 100).toFixed(1) : 0;
    const channelAccuracy = totalTests > 0 ? (channelMatches / totalTests * 100).toFixed(1) : 0;
    const categoryExtractionRate = totalTests > 0 ? (categoryExtracted / totalTests * 100).toFixed(1) : 0;
    const successRate = (successfulScrapes / EXPECTED_DATA.length * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 ACCURACY SUMMARY');
    console.log('='.repeat(60));
    console.log(`🎯 Total Videos Tested: ${EXPECTED_DATA.length}`);
    console.log(`✅ Successful Scrapes: ${successfulScrapes}/${EXPECTED_DATA.length} (${successRate}%)`);
    console.log(`📝 Title Accuracy: ${titleMatches}/${totalTests} (${titleAccuracy}%)`);
    console.log(`👤 Channel Accuracy: ${channelMatches}/${totalTests} (${channelAccuracy}%)`);
    console.log(`🏷️ Category Extraction Rate: ${categoryExtracted}/${totalTests} (${categoryExtractionRate}%)`);
    
    // Store results for final summary
    this.results = {
      totalVideos: EXPECTED_DATA.length,
      successfulScrapes,
      successRate: parseFloat(successRate),
      titleAccuracy: parseFloat(titleAccuracy),
      channelAccuracy: parseFloat(channelAccuracy),
      categoryExtractionRate: parseFloat(categoryExtractionRate),
      scrapedResults
    };
  }

  isTitleMatch(scrapedTitle, expectedTitle) {
    if (!scrapedTitle || !expectedTitle) return false;
    
    // Normalize titles for comparison
    const normalize = (title) => title.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const scraped = normalize(scrapedTitle);
    const expected = normalize(expectedTitle);
    
    // Check for exact match or contains
    return scraped === expected || scraped.includes(expected) || expected.includes(scraped);
  }

  isChannelMatch(scrapedChannel, expectedChannel) {
    if (!scrapedChannel || !expectedChannel) return false;
    
    // Normalize channel names for comparison
    const normalize = (channel) => channel.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const scraped = normalize(scrapedChannel);
    const expected = normalize(expectedChannel);
    
    // Check for exact match or contains
    return scraped === expected || scraped.includes(expected) || expected.includes(scraped);
  }

  async testMetrics() {
    console.log('\n=== 📈 LLM Metrics ===');
    try {
      const result = await this.makeRequest('/api/llm-scraping/metrics');
      console.log('✅ LLM Metrics retrieved');
      console.log('📊 Performance metrics:', result.data.metrics);
      return result.data.metrics;
    } catch (error) {
      console.log('❌ LLM Metrics retrieval failed');
      return null;
    }
  }

  async runFullAccuracyTest() {
    console.log('🚀 Starting LLM Scraping Accuracy Test');
    console.log('='.repeat(60));
    console.log('🎯 Testing Gemma model accuracy on test-watch-history-small.html');
    console.log('📋 Expected data from HTML file:');
    EXPECTED_DATA.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.expectedTitle} by ${item.expectedChannel} (${item.videoId})`);
    });
    console.log('='.repeat(60));

    const testResults = {
      healthCheck: false,
      llmHealthCheck: false,
      llmConfiguration: false,
      scrapingAccuracy: null,
      metrics: null
    };

    // 1. Basic Health Check
    testResults.healthCheck = await this.testHealthCheck();
    if (!testResults.healthCheck) {
      console.log('\n⚠️  Backend service not available. Make sure:');
      console.log('   - Backend server is running (npm run dev)');
      console.log('   - Server is accessible at:', API_BASE_URL);
      return testResults;
    }

    // 2. LLM Scraping Health Check
    testResults.llmHealthCheck = await this.testLLMScrapingHealth();
    if (!testResults.llmHealthCheck) {
      console.log('\n⚠️  LLM Scraping service not available. Make sure:');
      console.log('   - LLM_SCRAPING_ENABLED=true in .env');
      console.log('   - OPENROUTER_API_KEY is set');
      console.log('   - LLM_PROVIDER=google and LLM_MODEL=gemma-3-4b-it');
      return testResults;
    }

    // 3. LLM Configuration Check
    testResults.llmConfiguration = await this.testLLMConfiguration();

    // 4. Accuracy Test
    testResults.scrapingAccuracy = await this.testLLMScrapingAccuracy();

    // 5. Metrics
    testResults.metrics = await this.testMetrics();

    // Final Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ACCURACY TEST COMPLETED');
    console.log('='.repeat(60));
    
    if (this.results) {
      console.log(`📊 Final Results:`);
      console.log(`   🎯 Success Rate: ${this.results.successRate}%`);
      console.log(`   📝 Title Accuracy: ${this.results.titleAccuracy}%`);
      console.log(`   👤 Channel Accuracy: ${this.results.channelAccuracy}%`);
      console.log(`   🏷️ Category Extraction: ${this.results.categoryExtractionRate}%`);
      
      if (testResults.scrapingAccuracy && testResults.scrapingAccuracy.summary) {
        const totalCost = testResults.scrapingAccuracy.summary.totalCost || 0;
        console.log(`   💰 Total Cost: $${totalCost.toFixed(4)}`);
      }
    }

    return testResults;
  }
}

// Run the accuracy test if this script is executed directly
if (require.main === module) {
  const accuracyTest = new LLMAccuracyTest();
  accuracyTest.runFullAccuracyTest()
    .then((results) => {
      console.log('\n✅ Accuracy test finished successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Accuracy test failed:', error);
      process.exit(1);
    });
}

module.exports = LLMAccuracyTest; 