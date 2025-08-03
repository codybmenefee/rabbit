#!/usr/bin/env node

const axios = require('axios');

async function testOpenRouterDirect() {
  console.log('🔧 Testing OpenRouter API directly through backend\n');
  
  try {
    console.log('🧪 Testing LLM scraping endpoint with real video...');
    
    const response = await axios.post('http://localhost:5000/api/llm-scraping/scrape', {
      videoIds: ['dQw4w9WgXcQ'], // Rick Roll - reliable test video
      config: {
        provider: 'google',
        model: 'gemma-3-4b-it',
        maxTokens: 2000,
        temperature: 0.1,
        costLimit: 0.25, // 25 cents limit
        maxConcurrentRequests: 1,
        requestDelayMs: 1000
      }
    }, {
      timeout: 60000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ LLM scraping request successful!\n');
    
    const data = response.data;
    console.log('📊 Response Summary:');
    console.log(`   Success: ${data.success}`);
    console.log(`   Total videos: ${data.data.summary.totalVideos}`);
    console.log(`   Successful: ${data.data.summary.successfulVideos}`);
    console.log(`   Failed: ${data.data.summary.failedVideos}`);
    console.log(`   Success rate: ${data.data.summary.successRate.toFixed(1)}%`);
    console.log(`   Total cost: $${data.data.summary.totalCost.toFixed(4)}`);
    console.log(`   Total tokens: ${data.data.summary.totalTokensUsed}`);
    
    if (data.data.results && data.data.results.length > 0) {
      const result = data.data.results[0];
      
      console.log('\n📹 Video Result:');
      console.log(`   Video ID: ${result.videoId}`);
      console.log(`   Success: ${result.success}`);
      console.log(`   Provider: ${result.provider}`);
      console.log(`   Model: ${result.model}`);
      console.log(`   Tokens used: ${result.tokensUsed}`);
      console.log(`   Cost: $${result.cost.toFixed(4)}`);
      
      if (result.success && result.data) {
        console.log('\n🎯 Extracted Metadata:');
        console.log(`   Title: ${result.data.title || 'N/A'}`);
        console.log(`   Channel: ${result.data.channelName || 'N/A'}`);
        console.log(`   Views: ${result.data.viewCount ? result.data.viewCount.toLocaleString() : 'N/A'}`);
        console.log(`   Likes: ${result.data.likeCount ? result.data.likeCount.toLocaleString() : 'N/A'}`);
        console.log(`   Duration: ${result.data.duration ? `${Math.floor(result.data.duration / 60)}:${(result.data.duration % 60).toString().padStart(2, '0')}` : 'N/A'}`);
        console.log(`   Category: ${result.data.category || 'N/A'}`);
        console.log(`   Published: ${result.data.publishedAt || 'N/A'}`);
        console.log(`   Is Short: ${result.data.isShort ? 'Yes' : 'No'}`);
        if (result.data.tags && result.data.tags.length > 0) {
          console.log(`   Tags: ${result.data.tags.slice(0, 5).join(', ')}${result.data.tags.length > 5 ? '...' : ''}`);
        }
        
        console.log('\n🎉 OpenRouter AI extraction is working perfectly!');
        console.log('Your API key and service configuration are correct.');
        
      } else {
        console.log(`\n❌ Extraction failed: ${result.error}`);
        console.log('This indicates an issue with the OpenRouter API call.');
      }
    }
    
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Response:`, JSON.stringify(error.response.data, null, 2));
    }
  }
}

testOpenRouterDirect();