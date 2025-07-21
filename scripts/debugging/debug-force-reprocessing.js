const fs = require('fs');
const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:5000';
const WATCH_HISTORY_FILE = './test-watch-history.html'; // Update this path

async function debugForceReprocessing() {
  console.log('🐛 Debug: Force Reprocessing Test\n');

  try {
    // Read the watch history file
    console.log('📖 Reading watch history file...');
    const htmlContent = fs.readFileSync(WATCH_HISTORY_FILE, 'utf8');
    console.log(`✅ Read ${htmlContent.length} characters\n`);

    // Test with minimal options to avoid filtering
    console.log('🔄 Testing with force reprocessing and minimal filtering...');
    const requestPayload = {
      htmlContent: htmlContent,
      options: {
        enrichWithAPI: true,
        useScrapingService: false,
        useHighPerformanceService: true,
        forceReprocessing: true,
        includeAds: true,        // Include everything
        includeShorts: true,     // Include everything
        // No date range filters
        // No category filters
      }
    };

    console.log('📤 Request payload options:', JSON.stringify(requestPayload.options, null, 2));

    const response = await axios.post(`${API_BASE_URL}/api/analytics/upload`, requestPayload, {
      timeout: 600000, // 10 minute timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Processing completed successfully!');
      console.log('\n📊 Results:');
      console.log(`- Total videos processed: ${response.data.metrics?.totalVideos || 'N/A'}`);
      console.log(`- Processing stats: ${JSON.stringify(response.data.processingStats, null, 2)}`);
      
    } else {
      console.log('📡 Async processing started...');
      console.log(`Session ID: ${response.data.sessionId || 'Not provided'}`);
    }

  } catch (error) {
    if (error.response?.status === 413) {
      console.error('❌ Payload too large error');
    } else if (error.response?.data?.sessionId) {
      console.log('📡 Async processing started due to timeout...');
      console.log(`Session ID: ${error.response.data.sessionId}`);
      console.log('\n🔍 Now check the backend logs for these key messages:');
      console.log('1. "Starting watch history parsing..." - should show forceReprocessing: true');
      console.log('2. "Force reprocessing enabled: Processing all X videos"');
      console.log('3. "Applied pre-enrichment filters, X entries remaining"');
      console.log('4. Look for any filtering that reduces the count significantly');
    } else {
      console.error('❌ Test failed:', error.response?.data?.message || error.message);
      
      if (error.response?.data) {
        console.log('\n📝 Full error response:', JSON.stringify(error.response.data, null, 2));
      }
    }
  }
}

// Test without force reprocessing for comparison
async function debugNormalProcessing() {
  console.log('\n🔄 Testing WITHOUT force reprocessing (for comparison)...');

  try {
    const htmlContent = fs.readFileSync(WATCH_HISTORY_FILE, 'utf8');
    
    const requestPayload = {
      htmlContent: htmlContent,
      options: {
        enrichWithAPI: true,
        useScrapingService: false,
        useHighPerformanceService: true,
        forceReprocessing: false,  // Normal processing
        includeAds: true,
        includeShorts: true,
      }
    };

    const response = await axios.post(`${API_BASE_URL}/api/analytics/upload`, requestPayload, {
      timeout: 30000, // Shorter timeout
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      console.log('✅ Normal processing completed');
      console.log(`- Videos processed: ${response.data.metrics?.totalVideos || 'N/A'}`);
    }

  } catch (error) {
    if (error.response?.data?.sessionId) {
      console.log('📡 Normal processing started async');
      console.log(`Session ID: ${error.response.data.sessionId}`);
    } else {
      console.log('❌ Normal processing error (expected if duplicates exist)');
    }
  }
}

async function main() {
  try {
    await debugForceReprocessing();
    await debugNormalProcessing();
    
    console.log('\n✨ Debug completed!');
    console.log('\n🔍 Check your backend logs for:');
    console.log('- "Force reprocessing enabled: Processing all X videos"');
    console.log('- "Applied pre-enrichment filters, X entries remaining"');
    console.log('- Any large drops in video count during filtering');
    
  } catch (error) {
    console.error('💥 Debug failed:', error.message);
  }
}

main(); 