const fs = require('fs');
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const WATCH_HISTORY_FILE = './test-watch-history.html'; // Update this path to your test file

async function testForceReprocessing() {
  console.log('🚀 Testing Force Reprocessing with High-Performance Scraping...\n');

  try {
    // Read the watch history file
    console.log('📖 Reading watch history file...');
    const htmlContent = fs.readFileSync(WATCH_HISTORY_FILE, 'utf8');
    console.log(`✅ Read ${htmlContent.length} characters from watch history file\n`);

    // Test with force reprocessing enabled
    console.log('🔄 Starting processing with force reprocessing enabled...');
    const response = await axios.post(`${API_BASE_URL}/api/analytics/upload`, {
      htmlContent: htmlContent,
      options: {
        enrichWithAPI: true,
        useScrapingService: false,
        useHighPerformanceService: true,  // Enable high-performance scraping
        forceReprocessing: true,          // Enable force reprocessing
        includeAds: false,
        includeShorts: true
      }
    }, {
      timeout: 600000, // 10 minute timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Processing completed successfully!');
      console.log('\n📊 Results:');
      console.log(`- Total videos processed: ${response.data.metrics?.totalVideos || 'N/A'}`);
      console.log(`- Total watch time: ${response.data.metrics?.totalWatchTime || 'N/A'} minutes`);
      console.log(`- Unique channels: ${response.data.metrics?.uniqueChannels || 'N/A'}`);
      
      if (response.data.processingStats) {
        console.log('\n⚡ Processing Stats:');
        console.log(`- Raw entries extracted: ${response.data.processingStats.totalEntries || 'N/A'}`);
        console.log(`- Videos processed: ${response.data.processingStats.enrichedEntries || 'N/A'}`);
        console.log(`- Processing time: ${response.data.processingStats.processingTime || 'N/A'}ms`);
        console.log(`- Duplicates handled: ${response.data.processingStats.duplicatesRemoved || 'N/A'} (should be 0 with force reprocessing)`);
      }

      console.log('\n✨ Force reprocessing test completed successfully!');
      
    } else if (response.data.sessionId) {
      console.log('📡 Async processing started...');
      console.log(`Session ID: ${response.data.sessionId}`);
      console.log('Use this session ID to check progress manually via:');
      console.log(`GET ${API_BASE_URL}/api/analytics/progress/${response.data.sessionId}`);
      
    } else {
      console.error('❌ Processing failed:', response.data.message);
    }

  } catch (error) {
    if (error.response?.data?.sessionId) {
      console.log('📡 Async processing started due to timeout...');
      console.log(`Session ID: ${error.response.data.sessionId}`);
      
      // Optionally poll for progress
      if (process.argv.includes('--poll')) {
        console.log('🔄 Polling for progress...');
        await pollProgress(error.response.data.sessionId);
      } else {
        console.log('Use --poll flag to automatically wait for completion');
        console.log(`Or check progress manually: GET ${API_BASE_URL}/api/analytics/progress/${error.response.data.sessionId}`);
      }
    } else {
      console.error('❌ Test failed:', error.response?.data?.message || error.message);
    }
  }
}

async function pollProgress(sessionId) {
  const maxAttempts = 1200; // 10 minutes max (1200 * 0.5s = 10min)
  let attempts = 0;
  
  console.log('📊 Progress polling started...\n');
  
  return new Promise((resolve, reject) => {
    const progressInterval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/analytics/progress/${sessionId}`);
        
        if (response.data.success && response.data.progress) {
          const progress = response.data.progress;
          
          // Show progress
          const progressBar = '█'.repeat(Math.floor(progress.progress / 5)) + 
                            '░'.repeat(20 - Math.floor(progress.progress / 5));
          process.stdout.write(`\r[${progressBar}] ${progress.progress}% - ${progress.message}`);
          
          if (progress.isComplete || progress.error) {
            clearInterval(progressInterval);
            console.log('\n');
            
            if (progress.error) {
              console.error(`❌ Processing failed: ${progress.error}`);
              reject(new Error(progress.error));
            } else {
              console.log('✅ Processing completed successfully!');
              
              // Get final results
              try {
                const resultResponse = await axios.get(`${API_BASE_URL}/api/analytics/metrics/${sessionId}`);
                if (resultResponse.data.success) {
                  console.log('\n📊 Final Results:');
                  console.log(`- Total videos: ${resultResponse.data.metrics?.totalVideos || 'N/A'}`);
                  console.log(`- Total watch time: ${resultResponse.data.metrics?.totalWatchTime || 'N/A'} minutes`);
                  console.log(`- Unique channels: ${resultResponse.data.metrics?.uniqueChannels || 'N/A'}`);
                }
              } catch (resultError) {
                console.error('❌ Failed to fetch final results:', resultError.message);
              }
              
              resolve();
            }
          }
        }
      } catch (error) {
        if (attempts >= maxAttempts) {
          clearInterval(progressInterval);
          console.log('\n❌ Progress polling timeout');
          reject(new Error('Polling timeout'));
        }
        // Continue polling on error
      }
      
      // Timeout after max attempts
      if (attempts >= maxAttempts) {
        clearInterval(progressInterval);
        console.log('\n❌ Progress polling timeout');
        reject(new Error('Polling timeout'));
      }
    }, 500); // Poll every 500ms
  });
}

// Show usage information
function showUsage() {
  console.log('🧪 Force Reprocessing Test Script\n');
  console.log('Usage: node test-force-reprocessing.js [options]\n');
  console.log('Options:');
  console.log('  --poll    Automatically wait for async processing to complete');
  console.log('  --help    Show this help message\n');
  console.log('Make sure to:');
  console.log('1. Update WATCH_HISTORY_FILE path in the script');
  console.log('2. Start your backend server on port 5000');
  console.log('3. Enable high-performance scraping in your environment\n');
}

// Main execution
if (process.argv.includes('--help')) {
  showUsage();
} else {
  testForceReprocessing()
    .then(() => {
      console.log('\n🎉 Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test failed:', error.message);
      process.exit(1);
    });
} 