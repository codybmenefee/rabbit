#!/usr/bin/env node

/**
 * Simple LLM scraping test using real video IDs from watch history
 */

const axios = require('axios');

// Real video IDs from the user's watch history
const REAL_VIDEO_IDS = [
  'EzEp-Vr4Oao',   // From user's actual watch history
  'OPuM2FKCmtM',   // From user's actual watch history  
  '1wMM87UKr_c',   // From user's actual watch history
  '4Tt-o56oGKo'    // From user's actual watch history
];

const API_BASE_URL = 'http://localhost:5000';

async function testSingleVideo(videoId) {
  console.log(`\n🔍 Testing AI extraction for: https://youtube.com/watch?v=${videoId}`);
  
  try {
    // Test the LLM scraping directly
    const response = await axios.post(`${API_BASE_URL}/api/llm-scraping/scrape`, {
      videoIds: [videoId],
      config: {
        provider: 'google',
        model: 'gemma-3-4b-it',
        maxTokens: 2000,
        temperature: 0.1,
        costLimit: 0.50 // Limit to 50 cents per test
      }
    }, {
      timeout: 60000 // 60 second timeout
    });
    
    if (response.data.success && response.data.results.length > 0) {
      const result = response.data.results[0];
      
      if (result.success && result.data) {
        console.log('✅ AI Extraction Successful!');
        console.log(`   Cost: $${result.cost.toFixed(4)} (${result.tokensUsed} tokens)`);
        console.log(`   Title: ${result.data.title || 'N/A'}`);
        console.log(`   Channel: ${result.data.channelName || 'N/A'}`);
        console.log(`   Views: ${result.data.viewCount ? result.data.viewCount.toLocaleString() : 'N/A'}`);
        console.log(`   Likes: ${result.data.likeCount ? result.data.likeCount.toLocaleString() : 'N/A'}`);
        console.log(`   Duration: ${result.data.duration ? `${Math.floor(result.data.duration / 60)}:${(result.data.duration % 60).toString().padStart(2, '0')}` : 'N/A'}`);
        console.log(`   Category: ${result.data.category || 'N/A'}`);
        console.log(`   Is Short: ${result.data.isShort ? 'Yes' : 'No'}`);
        return true;
      } else {
        console.log(`❌ AI Extraction Failed: ${result.error || 'Unknown error'}`);
        return false;
      }
    } else {
      console.log('❌ API request failed');
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function testBackendHealth() {
  console.log('🏥 Checking backend health...');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    
    if (response.data.status === 'healthy') {
      console.log('✅ Backend is healthy and running');
      console.log(`   Version: ${response.data.version}`);
      console.log(`   Database: ${response.data.database ? 'Connected' : 'Disconnected'}`);
      return true;
    } else {
      console.log('❌ Backend is unhealthy');
      return false;
    }
  } catch (error) {
    console.log(`❌ Backend connection failed: ${error.message}`);
    console.log('   Make sure the backend is running: cd backend && npm run dev');
    return false;
  }
}

async function runTest() {
  console.log('🚀 Rabbit Analytics - Simple LLM Test\n');
  
  // Check backend first
  const isHealthy = await testBackendHealth();
  if (!isHealthy) {
    console.log('\n❌ Cannot run tests - backend is not responding');
    process.exit(1);
  }
  
  // Test one video at a time
  console.log('\n🧪 Testing AI-powered extraction with real videos from your watch history...');
  
  let successCount = 0;
  const totalTests = REAL_VIDEO_IDS.length;
  
  for (let i = 0; i < totalTests; i++) {
    const videoId = REAL_VIDEO_IDS[i];
    const success = await testSingleVideo(videoId);
    if (success) successCount++;
    
    // Add delay between tests to avoid rate limiting
    if (i < totalTests - 1) {
      console.log('   Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`   Successful extractions: ${successCount}/${totalTests}`);
  console.log(`   Success rate: ${((successCount / totalTests) * 100).toFixed(1)}%`);
  
  if (successCount === totalTests) {
    console.log('\n🎉 All tests passed! Your AI extraction system is working perfectly!');
  } else if (successCount > 0) {
    console.log('\n⚠️  Some tests passed. The system is working but may have intermittent issues.');
  } else {
    console.log('\n❌ All tests failed. Please check your configuration.');
  }
}

// Run if called directly
if (require.main === module) {
  runTest().catch(error => {
    console.error('\n💥 Test failed with error:', error.message);
    process.exit(1);
  });
}

module.exports = { runTest, testSingleVideo, testBackendHealth };