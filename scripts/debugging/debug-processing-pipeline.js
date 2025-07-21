const mongoose = require('mongoose');

// Import the services (simplified versions)
const { VideoEntry } = require('./dist/models/VideoEntry');
const { VideoService } = require('./dist/services/VideoService');
const { AnalyticsService } = require('./dist/services/AnalyticsService');
const { ParserService } = require('./dist/services/ParserService');

// Test HTML content with a few sample videos
const testHtml = `
<!DOCTYPE html>
<html>
<head><title>My Activity</title></head>
<body>
<div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
  <a href="https://www.youtube.com/watch?v=dQw4w9WgXcQ">Rick Astley - Never Gonna Give You Up (Official Music Video)</a><br>
  <a href="https://www.youtube.com/channel/UCuAXFkgsw1L7xaCfnd5JJOw">Rick Astley</a><br>
  Dec 25, 2023, 10:30:45 AM PST
</div>
<div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
  <a href="https://www.youtube.com/watch?v=test123">Test Video Title</a><br>
  <a href="https://www.youtube.com/channel/UCtest123">Test Channel</a><br>
  Dec 24, 2023, 2:15:30 PM PST
</div>
</body>
</html>
`;

async function testProcessingPipeline() {
  try {
    console.log('🧪 Testing the actual processing pipeline...\n');

    // Connect to database
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect('mongodb+srv://codybmenefee:mollys@cluster0.kxya0vs.mongodb.net/rabbit-analytics?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to MongoDB Atlas');

    // Initialize services
    console.log('\n🔧 Initializing services...');
    const analyticsService = new AnalyticsService();
    const videoService = new VideoService();
    console.log('✅ Services initialized');

    // Create parser service without API/scraping services for simplicity
    const parserService = new ParserService(
      null, // youtubeAPI
      analyticsService,
      videoService,
      undefined, // youtubeScraping
      undefined  // youtubeHighPerformanceScraping
    );
    console.log('✅ Parser service initialized');

    // Test 1: Check initial database state
    console.log('\n📊 Checking initial database state...');
    const initialCount = await VideoEntry.countDocuments();
    console.log(`   Initial video count: ${initialCount}`);

    // Test 2: Process the HTML content
    console.log('\n📝 Processing test HTML content...');
    const options = {
      enrichWithAPI: false, // Disable API enrichment for this test
      useScrapingService: false,
      useHighPerformanceService: false,
      forceReprocessing: false,
      includeAds: true,
      includeShorts: true
    };

    console.log('   Options:', options);
    
    try {
      const result = await parserService.parseWatchHistory(testHtml, options, 'test-session');
      
      console.log('\n✅ Processing completed successfully!');
      console.log(`   Total entries processed: ${result.entries.length}`);
      console.log(`   Valid entries: ${result.processingStats.validEntries}`);
      console.log(`   Processing time: ${result.processingStats.processingTime}s`);
      
      if (result.processingStats.errors.length > 0) {
        console.log('⚠️  Processing errors:', result.processingStats.errors);
      }

      // Sample of processed entries
      if (result.entries.length > 0) {
        console.log('\n📋 Sample of processed entries:');
        result.entries.slice(0, 3).forEach((entry, index) => {
          console.log(`   ${index + 1}. "${entry.title}"`);
          console.log(`      Channel: ${entry.channel}`);
          console.log(`      Category: ${entry.category}`);
          console.log(`      Content Type: ${entry.contentType}`);
          console.log(`      Enriched: ${entry.enrichedWithAPI}`);
          console.log('');
        });
      }

    } catch (processingError) {
      console.error('❌ Processing failed:', processingError);
      console.error('   Stack trace:', processingError.stack);
    }

    // Test 3: Check final database state
    console.log('\n📊 Checking final database state...');
    const finalCount = await VideoEntry.countDocuments();
    console.log(`   Final video count: ${finalCount}`);
    console.log(`   Videos added: ${finalCount - initialCount}`);

    if (finalCount > initialCount) {
      console.log('\n🎉 SUCCESS: Videos were saved to database!');
      
      // Show saved videos
      const savedVideos = await VideoEntry.find().limit(5).select('title channel category enrichedWithAPI lastUpdated');
      console.log('\n📋 Sample of saved videos:');
      savedVideos.forEach((video, index) => {
        console.log(`   ${index + 1}. "${video.title}"`);
        console.log(`      Channel: ${video.channel}`);
        console.log(`      Category: ${video.category}`);
        console.log(`      Enriched: ${video.enrichedWithAPI}`);
        console.log(`      Last Updated: ${video.lastUpdated}`);
        console.log('');
      });
    } else {
      console.log('\n❌ PROBLEM: No videos were saved to database!');
      console.log('   This indicates an issue with the database save operations in the processing pipeline.');
    }

    // Clean up test data
    if (finalCount > initialCount) {
      console.log('\n🧹 Cleaning up test data...');
      const deleteResult = await VideoEntry.deleteMany({
        $or: [
          { url: { $regex: /dQw4w9WgXcQ/ } },
          { url: { $regex: /test123/ } }
        ]
      });
      console.log(`🗑️  Deleted ${deleteResult.deletedCount} test videos`);
    }

  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
    console.error('   Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the test
testProcessingPipeline().catch(console.error); 