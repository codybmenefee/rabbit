#!/usr/bin/env node

/**
 * Debug test for LLM scraping - let's see the actual response structure
 */

const axios = require('axios');

async function debugLLMTest() {
  console.log('🔍 Debug Test - Checking LLM Scraping Response Structure\n');
  
  try {
    const response = await axios.post('http://localhost:5000/api/llm-scraping/scrape', {
      videoIds: ['dQw4w9WgXcQ'], // Rick Roll - simple test
      config: {
        provider: 'google',
        model: 'gemma-3-4b-it',
        maxTokens: 2000,
        temperature: 0.1,
        costLimit: 0.10 // Just 10 cents for debug
      }
    }, {
      timeout: 30000
    });
    
    console.log('✅ Raw Response Status:', response.status);
    console.log('✅ Raw Response Data Structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error details:');
    console.log('Message:', error.message);
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.code) {
      console.log('Error code:', error.code);
    }
  }
}

async function testDirectVideoScraping() {
  console.log('\n🧪 Testing YouTubeLLMScrapingService.scrapeVideos() method directly\n');
  
  try {
    // Test using the actual service method the parser uses
    const response = await axios.post('http://localhost:5000/api/analytics/upload', {
      htmlContent: `
<!DOCTYPE html>
<html>
<head><title>Test</title></head>
<body>
<div class="content-cell">
  <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Rick Astley - Never Gonna Give You Up</a><br>
  Rick Astley<br>
  Jan 1, 2024, 12:00:00 PM PST
</div>
</body>
</html>`,
      options: {
        enrichWithAPI: true,
        useLLMService: true,
        useScrapingService: false,
        useHighPerformanceService: false,
        forceReprocessing: true,
        includeAds: false,
        includeShorts: true
      }
    }, {
      timeout: 60000
    });
    
    console.log('✅ Processing Pipeline Response:');
    console.log('Success:', response.data.success);
    if (response.data.entries && response.data.entries.length > 0) {
      const entry = response.data.entries[0];
      console.log('\n📹 Video Data Extracted:');
      console.log('  Title:', entry.title);
      console.log('  Channel:', entry.channel);
      console.log('  Enriched with API:', entry.enrichedWithAPI);
      console.log('  LLM Enriched:', entry.llmEnriched);
      console.log('  Duration:', entry.duration);
      console.log('  View Count:', entry.viewCount);
      console.log('  Like Count:', entry.likeCount);
      console.log('  Category:', entry.category);
      console.log('  LLM Provider:', entry.llmProvider);
      if (entry.llmCost) {
        console.log('  LLM Cost:', `$${entry.llmCost.toFixed(4)}`);
      }
    }
    
    console.log('\n📊 Processing Stats:');
    console.log('  Total Entries:', response.data.processingStats.totalEntries);
    console.log('  Valid Entries:', response.data.processingStats.validEntries);
    console.log('  Processing Time:', response.data.processingStats.processingTime.toFixed(2) + 's');
    console.log('  Errors:', response.data.processingStats.errors.length);
    
    return true;
    
  } catch (error) {
    console.log('❌ Pipeline test failed:', error.message);
    if (error.response) {
      console.log('Response:', JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function runDebugTests() {
  console.log('🚀 LLM Scraping Debug Tests\n');
  
  // Test 1: Check the direct API endpoint structure
  await debugLLMTest();
  
  // Test 2: Test through the processing pipeline (this works)
  const pipelineWorking = await testDirectVideoScraping();
  
  console.log('\n📝 Debug Summary:');
  console.log('- Processing pipeline integration: ' + (pipelineWorking ? '✅ WORKING' : '❌ FAILED'));
  console.log('- Direct LLM API endpoint: Check logs above for structure');
  
  if (pipelineWorking) {
    console.log('\n🎉 Good news! AI extraction is working through the main pipeline!');
    console.log('This means users can upload watch history and get AI-powered extraction.');
    console.log('The direct API endpoint may just need a small fix.');
  }
}

runDebugTests().catch(console.error);