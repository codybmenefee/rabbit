#!/usr/bin/env node

/**
 * Test the actual processing pipeline that works
 */

const axios = require('axios');

// Real video IDs from user's watch history
const REAL_VIDEO_IDS = [
  'EzEp-Vr4Oao',   // From user's actual watch history
  'OPuM2FKCmtM',   // From user's actual watch history  
  '1wMM87UKr_c'    // From user's actual watch history
];

async function testAIPipeline() {
  console.log('🚀 Testing AI-Powered Processing Pipeline\n');
  
  // Create minimal HTML with real video IDs
  const testHtml = `
<!DOCTYPE html>
<html>
<head><title>YouTube Watch History</title></head>
<body>
<div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
  ${REAL_VIDEO_IDS.map(videoId => 
    `<div class="content-cell mdl-cell mdl-cell--12-col mdl-typography--caption">
      <a href="https://www.youtube.com/watch?v=${videoId}">Video ${videoId}</a><br>
      Test Channel<br>
      Jan 1, 2024, 12:00:00 PM PST
    </div>`
  ).join('\n  ')}
</div>
</body>
</html>`;

  console.log(`📹 Testing with ${REAL_VIDEO_IDS.length} real videos from your watch history:`);
  REAL_VIDEO_IDS.forEach((id, index) => {
    console.log(`   ${index + 1}. https://youtube.com/watch?v=${id}`);
  });

  console.log('\n🤖 Using AI-powered extraction as primary method...');
  
  try {
    const response = await axios.post('http://localhost:5000/api/analytics/upload', {
      htmlContent: testHtml,
      options: {
        enrichWithAPI: true,
        useLLMService: true,    // AI extraction as primary
        useScrapingService: false,
        useHighPerformanceService: false,
        forceReprocessing: true,
        includeAds: false,
        includeShorts: true
      }
    }, {
      timeout: 120000 // 2 minute timeout for AI processing
    });
    
    if (response.data.success) {
      console.log('✅ AI-powered processing completed successfully!\n');
      
      const stats = response.data.processingStats;
      console.log('📊 Processing Statistics:');
      console.log(`   Total entries: ${stats.totalEntries}`);
      console.log(`   Valid entries: ${stats.validEntries}`);
      console.log(`   Processing time: ${stats.processingTime.toFixed(2)}s`);
      console.log(`   Errors: ${stats.errors.length}`);
      
      if (response.data.entries && response.data.entries.length > 0) {
        console.log('\n🎯 AI Extraction Results:');
        
        response.data.entries.forEach((entry, index) => {
          console.log(`\n📹 Video ${index + 1} (${REAL_VIDEO_IDS[index]}):`);
          console.log(`   Title: ${entry.title || 'N/A'}`);
          console.log(`   Channel: ${entry.channel || 'N/A'}`);
          console.log(`   Category: ${entry.category || 'N/A'}`);
          console.log(`   Duration: ${entry.duration || 'N/A'}`);
          console.log(`   Views: ${entry.viewCount ? entry.viewCount.toLocaleString() : 'N/A'}`);
          console.log(`   Likes: ${entry.likeCount ? entry.likeCount.toLocaleString() : 'N/A'}`);
          console.log(`   Enriched with API: ${entry.enrichedWithAPI ? 'Yes' : 'No'}`);
          console.log(`   LLM Enhanced: ${entry.llmEnriched ? 'Yes' : 'No'}`);
          console.log(`   LLM Provider: ${entry.llmProvider || 'N/A'}`);
          if (entry.llmCost) {
            console.log(`   LLM Cost: $${entry.llmCost.toFixed(4)}`);
          }
          if (entry.processingErrors && entry.processingErrors.length > 0) {
            console.log(`   Errors: ${entry.processingErrors.join(', ')}`);
          }
        });
      }
      
      // Check for LLM usage in the summary
      if (response.data.summary) {
        console.log('\n💰 Cost Summary:');
        if (response.data.summary.llmCost) {
          console.log(`   Total LLM cost: $${response.data.summary.llmCost.toFixed(4)}`);
        }
        if (response.data.summary.llmTokensUsed) {
          console.log(`   Total tokens used: ${response.data.summary.llmTokensUsed.toLocaleString()}`);
        }
      }
      
      console.log('\n🎉 Success! Your AI-powered extraction system is working!');
      console.log('Users can now upload watch history files and get AI-enhanced metadata.');
      
    } else {
      console.log(`❌ Processing failed: ${response.data.message || 'Unknown error'}`);
    }
    
  } catch (error) {
    console.log(`❌ Pipeline test failed: ${error.message}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testAIPipeline();