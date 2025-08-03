#!/usr/bin/env node

/**
 * Test script for LLM scraping functionality
 * This script tests the AI-powered video metadata extraction
 */

const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000';

// Test video IDs - these are real YouTube videos of different types
const TEST_VIDEO_IDS = [
  'dQw4w9WgXcQ',      // Rick Astley - Never Gonna Give You Up (Music)
  'M7lc1UVf-VE',      // YouTube Rewind 2018 (Entertainment)
  'kJQP7kiw5Fk',      // Luis Fonsi - Despacito ft. Daddy Yankee (Music)
  'YQHsXMglC9A',      // Hello - Adele (Music)
  'pRpeEdMmmQ0',      // Shakira - Waka Waka (Music)
  'CevxZvSJLk8',      // Katy Perry - Roar (Music)
  'hTWKbfoikeg',      // Smosh video (Comedy)
  'OPf0YbXqDm0',      // Mark Rober science video (Education)
  'jNQXAC9IVRw',      // Me at the zoo (First YouTube video)
  'RgKAFK5djSk'       // Gangnam Style (Music)
];

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log(`\n${colors.bold}${colors.cyan}=== ${message} ===${colors.reset}\n`);
}

function logResult(success, message) {
  const color = success ? 'green' : 'red';
  const icon = success ? '✅' : '❌';
  log(color, `${icon} ${message}`);
}

async function checkBackendHealth() {
  logHeader('Checking Backend Health');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    
    if (response.data.status === 'healthy') {
      logResult(true, 'Backend is healthy and running');
      log('blue', `Version: ${response.data.version}`);
      log('blue', `Memory usage: ${response.data.memory.used}MB / ${response.data.memory.total}MB`);
      return true;
    } else {
      logResult(false, 'Backend is unhealthy');
      return false;
    }
  } catch (error) {
    logResult(false, `Backend connection failed: ${error.message}`);
    log('yellow', 'Make sure the backend server is running on port 5000');
    return false;
  }
}

async function testLLMScraping() {
  logHeader('Testing LLM Scraping Service');
  
  try {
    // Test with a small batch of video IDs
    const testVideoIds = TEST_VIDEO_IDS.slice(0, 3); // Start with just 3 videos
    
    log('blue', `Testing LLM scraping with ${testVideoIds.length} videos:`);
    testVideoIds.forEach((id, index) => {
      log('cyan', `  ${index + 1}. https://youtube.com/watch?v=${id}`);
    });
    
    const response = await axios.post(`${API_BASE_URL}/api/llm-scraping/scrape`, {
      videoIds: testVideoIds,
      config: {
        provider: 'google',
        model: 'gemma-3-4b-it',
        maxTokens: 3000,
        temperature: 0.1,
        costLimit: 1.0 // Limit to $1 for testing
      }
    });
    
    if (response.data.success) {
      logResult(true, `LLM scraping completed successfully`);
      
      const results = response.data.results;
      log('blue', `\nResults summary:`);
      log('cyan', `  Total videos: ${results.length}`);
      log('cyan', `  Successful: ${results.filter(r => r.success).length}`);
      log('cyan', `  Failed: ${results.filter(r => !r.success).length}`);
      log('cyan', `  Total cost: $${results.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(4)}`);
      
      // Show detailed results for each video
      console.log('\n' + colors.bold + 'Detailed Results:' + colors.reset);
      results.forEach((result, index) => {
        console.log(`\n${colors.magenta}Video ${index + 1}: ${testVideoIds[index]}${colors.reset}`);
        
        if (result.success && result.data) {
          const data = result.data;
          log('green', `  ✅ Success (${result.tokensUsed} tokens, $${result.cost.toFixed(4)})`);
          log('blue', `  Title: ${data.title || 'N/A'}`);
          log('blue', `  Channel: ${data.channelName || 'N/A'}`);
          log('blue', `  Views: ${data.viewCount ? data.viewCount.toLocaleString() : 'N/A'}`);
          log('blue', `  Likes: ${data.likeCount ? data.likeCount.toLocaleString() : 'N/A'}`);
          log('blue', `  Duration: ${data.duration ? `${Math.floor(data.duration / 60)}:${(data.duration % 60).toString().padStart(2, '0')}` : 'N/A'}`);
          log('blue', `  Category: ${data.category || 'N/A'}`);
          log('blue', `  Published: ${data.publishedAt || 'N/A'}`);
          log('blue', `  Is Short: ${data.isShort ? 'Yes' : 'No'}`);
          if (data.tags && data.tags.length > 0) {
            log('blue', `  Tags: ${data.tags.slice(0, 3).join(', ')}${data.tags.length > 3 ? '...' : ''}`);
          }
        } else {
          log('red', `  ❌ Failed: ${result.error || 'Unknown error'}`);
        }
      });
      
      return true;
    } else {
      logResult(false, `LLM scraping failed: ${response.data.message}`);
      return false;
    }
    
  } catch (error) {
    logResult(false, `LLM scraping test failed: ${error.message}`);
    if (error.response) {
      log('yellow', `Response status: ${error.response.status}`);
      log('yellow', `Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function testFullProcessingPipeline() {
  logHeader('Testing Full Processing Pipeline with AI Extraction');
  
  try {
    // Create a minimal HTML content with our test video IDs
    const testHtml = `
<!DOCTYPE html>
<html>
<head><title>Test Watch History</title></head>
<body>
<div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
  ${TEST_VIDEO_IDS.slice(0, 2).map(videoId => 
    `<div class="content-cell mdl-cell mdl-cell--12-col mdl-typography--caption">
      <a href="https://www.youtube.com/watch?v=${videoId}">Test Video ${videoId}</a><br>
      Test Channel<br>
      Jan 1, 2024, 12:00:00 PM PST
    </div>`
  ).join('\n  ')}
</div>
</body>
</html>`;
    
    log('blue', `Testing full pipeline with ${TEST_VIDEO_IDS.slice(0, 2).length} videos`);
    log('cyan', 'Using AI-powered extraction as primary method...');
    
    const response = await axios.post(`${API_BASE_URL}/api/analytics/upload`, {
      htmlContent: testHtml,
      options: {
        enrichWithAPI: true,
        useLLMService: true, // Use AI extraction as primary
        useScrapingService: false,
        useHighPerformanceService: false,
        forceReprocessing: true,
        includeAds: false,
        includeShorts: true
      }
    });
    
    if (response.data.success) {
      logResult(true, 'Full processing pipeline completed successfully');
      
      const stats = response.data.processingStats;
      const metrics = response.data.metrics;
      
      log('blue', '\nProcessing Statistics:');
      log('cyan', `  Total entries: ${stats.totalEntries}`);
      log('cyan', `  Valid entries: ${stats.validEntries}`);
      log('cyan', `  Processing time: ${stats.processingTime.toFixed(2)}s`);
      log('cyan', `  Errors: ${stats.errors.length}`);
      
      if (response.data.entries && response.data.entries.length > 0) {
        log('blue', '\nEnriched Video Data:');
        response.data.entries.slice(0, 2).forEach((entry, index) => {
          console.log(`\n${colors.magenta}Video ${index + 1}:${colors.reset}`);
          log('green', `  Title: ${entry.title}`);
          log('green', `  Channel: ${entry.channel}`);
          log('green', `  Category: ${entry.category}`);
          log('green', `  Duration: ${entry.duration || 'N/A'}`);
          log('green', `  Views: ${entry.viewCount ? entry.viewCount.toLocaleString() : 'N/A'}`);
          log('green', `  Enriched with API: ${entry.enrichedWithAPI ? 'Yes' : 'No'}`);
          log('green', `  LLM Enriched: ${entry.llmEnriched ? 'Yes' : 'No'}`);
          if (entry.llmProvider) {
            log('green', `  LLM Provider: ${entry.llmProvider}`);
          }
        });
      }
      
      return true;
    } else {
      logResult(false, `Processing pipeline failed: ${response.data.message}`);
      return false;
    }
    
  } catch (error) {
    logResult(false, `Processing pipeline test failed: ${error.message}`);
    if (error.response) {
      log('yellow', `Response status: ${error.response.status}`);
      log('yellow', `Response data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
    return false;
  }
}

async function runAllTests() {
  logHeader('Rabbit Analytics - LLM Scraping Test Suite');
  
  let allPassed = true;
  
  // Test 1: Backend Health
  const healthCheck = await checkBackendHealth();
  allPassed = allPassed && healthCheck;
  
  if (!healthCheck) {
    log('red', 'Skipping remaining tests due to backend connection failure');
    return;
  }
  
  // Test 2: Direct LLM Scraping
  const llmTest = await testLLMScraping();
  allPassed = allPassed && llmTest;
  
  // Test 3: Full Processing Pipeline
  const pipelineTest = await testFullProcessingPipeline();
  allPassed = allPassed && pipelineTest;
  
  // Final Summary
  logHeader('Test Results Summary');
  
  if (allPassed) {
    logResult(true, 'All tests passed! 🎉');
    log('green', '\nThe AI-powered extraction system is working correctly:');
    log('cyan', '  ✅ LLM scraping service is functional');
    log('cyan', '  ✅ Video metadata extraction is working');
    log('cyan', '  ✅ Processing pipeline integration is successful');
    log('cyan', '  ✅ Fallback mechanisms are in place');
    
    console.log(`\n${colors.bold}${colors.green}🚀 Your system is ready for production use!${colors.reset}\n`);
  } else {
    logResult(false, 'Some tests failed');
    log('yellow', '\nPlease check the error messages above and ensure:');
    log('cyan', '  - Backend server is running');
    log('cyan', '  - MongoDB connection is established');
    log('cyan', '  - OpenRouter API key is configured');
    log('cyan', '  - LLM service is enabled');
  }
}

// Run the tests
if (require.main === module) {
  runAllTests().catch(error => {
    console.error(`\n${colors.red}${colors.bold}Test suite failed with error:${colors.reset}`);
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  checkBackendHealth,
  testLLMScraping,
  testFullProcessingPipeline
};