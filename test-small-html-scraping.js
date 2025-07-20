const fs = require('fs');

async function testSmallHtmlScraping() {
  try {
    console.log('🧪 Testing small HTML file scraping with high-performance service...');
    
    // Read the small HTML file
    const htmlContent = fs.readFileSync('test-watch-history-small.html', 'utf8');
    console.log('📄 HTML file loaded, size:', htmlContent.length, 'bytes');
    
    // Set options to use high-performance service with force reprocessing
    const requestData = {
      htmlContent: htmlContent,
      options: {
        enrichWithAPI: true,
        useScrapingService: false,
        useHighPerformanceService: true,
        forceReprocessing: true,
        includeAds: false,
        includeShorts: true
      }
    };
    
    console.log('🚀 Sending request to backend...');
    console.log('Options:', JSON.stringify(requestData.options, null, 2));
    
    // Use curl with JSON data
    const { exec } = require('child_process');
    const util = require('util');
    const execPromise = util.promisify(exec);
    
    // Write request data to temporary file
    const tempFile = 'temp-request.json';
    fs.writeFileSync(tempFile, JSON.stringify(requestData));
    
    const curlCommand = `curl -X POST http://localhost:5000/api/analytics/upload \\
      -H "Content-Type: application/json" \\
      -d @${tempFile}`;
    
    console.log('Executing curl command...');
    const { stdout, stderr } = await execPromise(curlCommand);
    
    if (stderr) {
      console.error('Curl stderr:', stderr);
    }
    
    const result = JSON.parse(stdout);
    
    console.log('\n📊 Results:');
    console.log('Success:', result.success);
    console.log('Session ID:', result.sessionId);
    console.log('Total entries processed:', result.processingStats?.totalEntries || 0);
    console.log('Valid entries:', result.processingStats?.validEntries || 0);
    console.log('Processing time:', result.processingStats?.processingTime || 0, 'seconds');
    
    if (result.summary) {
      console.log('\n📈 Summary:');
      console.log('Total videos:', result.summary.totalVideos);
      console.log('Unique channels:', result.summary.uniqueChannels);
      console.log('Total watch time:', result.summary.totalWatchTime, 'minutes');
      console.log('API enrichment rate:', result.summary.apiEnrichmentRate + '%');
    }
    
    // Get the detailed entries
    if (result.sessionId) {
      console.log('\n🔍 Fetching detailed entries...');
      const entriesCommand = `curl -s "http://localhost:5000/api/analytics/entries?sessionId=${result.sessionId}&limit=10"`;
      const { stdout: entriesStdout } = await execPromise(entriesCommand);
      const entriesResult = JSON.parse(entriesStdout);
      
      if (entriesResult.success && entriesResult.entries && entriesResult.entries.length > 0) {
        console.log('\n🎥 Video Details:');
        entriesResult.entries.forEach((entry, index) => {
          console.log(`${index + 1}. "${entry.title}"`);
          console.log(`   Channel: ${entry.channel}`);
          console.log(`   Category: ${entry.category}`);
          console.log(`   Duration: ${entry.duration || 'N/A'} minutes`);
          console.log(`   Views: ${entry.viewCount || 'N/A'}`);
          console.log(`   Enriched: ${entry.enrichedWithAPI ? 'Yes' : 'No'}`);
          console.log(`   LLM Enriched: ${entry.llmEnriched ? 'Yes' : 'No'}`);
          console.log(`   LLM Provider: ${entry.llmProvider || 'N/A'}`);
          console.log('');
        });
      }
    }
    
    // Clean up temp file
    if (fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile);
    }
    
    console.log('\n✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

// Run the test
testSmallHtmlScraping(); 