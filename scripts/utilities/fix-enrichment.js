const mongoose = require('mongoose');

// Import the services
const { VideoEntry } = require('./dist/models/VideoEntry');
const { VideoService } = require('./dist/services/VideoService');
const { YouTubeAPIService } = require('./dist/services/YouTubeAPIService');

async function fixEnrichment() {
  try {
    console.log('🔧 Starting enrichment fix for existing videos...\n');

    // Connect to database
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect('mongodb+srv://codybmenefee:mollys@cluster0.kxya0vs.mongodb.net/rabbit-analytics?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to MongoDB Atlas');

    // Initialize YouTube API service
    const youtubeAPI = new YouTubeAPIService({
      apiKey: 'AIzaSyDfqJvtrvTDn0kZJgltD8snKy1LgRUZZPI', // From your .env file
      quotaLimit: 10000,
      batchSize: 50,
      requestDelay: 100,
      maxConcurrentRequests: 5
    });

    // Initialize video service
    const videoService = new VideoService();

    // Get total counts before
    const totalCount = await VideoEntry.countDocuments();
    const enrichedBefore = await VideoEntry.countDocuments({ enrichedWithAPI: true });
    
    console.log(`📊 Current status:`);
    console.log(`   Total videos: ${totalCount.toLocaleString()}`);
    console.log(`   Enriched: ${enrichedBefore.toLocaleString()} (${(enrichedBefore/totalCount*100).toFixed(1)}%)`);
    console.log(`   Need enrichment: ${(totalCount - enrichedBefore).toLocaleString()}`);

    // Find videos that need enrichment (have videoId but aren't enriched)
    console.log(`\n🔍 Finding videos that can be enriched...`);
    const videosToEnrich = await VideoEntry.find({
      $and: [
        { enrichedWithAPI: { $ne: true } },
        { 
          $or: [
            { url: { $regex: /youtube\.com\/watch\?v=/ } },
            { url: { $regex: /youtu\.be\// } }
          ]
        }
      ]
    }).limit(1000); // Start with first 1000 videos

    console.log(`   Found ${videosToEnrich.length} videos to enrich`);

    if (videosToEnrich.length === 0) {
      console.log('ℹ️  No videos need enrichment');
      return;
    }

    // Extract video IDs and prepare for enrichment
    console.log(`\n🎯 Extracting video IDs...`);
    const videoIdPattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    
    videosToEnrich.forEach(video => {
      const match = video.url.match(videoIdPattern);
      if (match && match[1]) {
        video.videoId = match[1];
      }
    });

    const validVideos = videosToEnrich.filter(v => v.videoId);
    console.log(`   ${validVideos.length} videos have valid YouTube IDs`);

    if (validVideos.length === 0) {
      console.log('❌ No videos with valid YouTube IDs found');
      return;
    }

    // Use YouTube API to enrich the videos
    console.log(`\n🚀 Starting YouTube API enrichment...`);
    console.log(`   Processing ${validVideos.length} videos in batches of 50`);

    const enrichedVideos = await youtubeAPI.enrichVideoEntries(validVideos);
    
    // Count successful enrichments
    const successfullyEnriched = enrichedVideos.filter(v => v.enrichedWithAPI);
    console.log(`✅ Successfully enriched: ${successfullyEnriched.length} videos`);

    if (successfullyEnriched.length > 0) {
      // Update the database with enriched data
      console.log(`\n💾 Saving enriched data to database...`);
      
      // Prepare updates for existing videos
      const updates = new Map();
      successfullyEnriched.forEach(video => {
        if (video.videoId) {
          updates.set(video.videoId, {
            channel: video.channel,
            channelId: video.channelId,
            category: video.category,
            description: video.description,
            duration: video.duration,
            viewCount: video.viewCount,
            likeCount: video.likeCount,
            commentCount: video.commentCount,
            publishedAt: video.publishedAt,
            tags: video.tags,
            thumbnailUrl: video.thumbnailUrl,
            enrichedWithAPI: true
          });
        }
      });

      const updateResult = await videoService.updateExistingVideos(updates);
      console.log(`✅ Database update completed:`);
      console.log(`   Modified: ${updateResult.modifiedCount} videos`);
      console.log(`   Matched: ${updateResult.matchedCount} videos`);

      // Show final status
      const enrichedAfter = await VideoEntry.countDocuments({ enrichedWithAPI: true });
      const improvement = enrichedAfter - enrichedBefore;
      
      console.log(`\n🎉 Enrichment fix completed!`);
      console.log(`📈 Results:`);
      console.log(`   Before: ${enrichedBefore} enriched videos (${(enrichedBefore/totalCount*100).toFixed(1)}%)`);
      console.log(`   After: ${enrichedAfter} enriched videos (${(enrichedAfter/totalCount*100).toFixed(1)}%)`);
      console.log(`   Improvement: +${improvement} videos`);

      // Show sample of enriched videos
      console.log(`\n📋 Sample of newly enriched videos:`);
      const enrichedSamples = await VideoEntry.find({ 
        enrichedWithAPI: true,
        lastUpdated: { $gte: new Date(Date.now() - 60 * 1000) } // Last minute
      }).limit(5);

      enrichedSamples.forEach((video, index) => {
        console.log(`  ${index + 1}. "${video.title.substring(0, 50)}..."`);
        console.log(`     Channel: ${video.channel}`);
        console.log(`     Category: ${video.category}`);
        console.log(`     Duration: ${video.duration}s`);
        console.log(`     Views: ${video.viewCount?.toLocaleString() || 'N/A'}`);
        console.log('');
      });

      // Check quota usage
      const quotaUsage = youtubeAPI.getQuotaUsage();
      console.log(`📊 API Quota Usage:`);
      console.log(`   Used: ${quotaUsage.used.toLocaleString()}`);
      console.log(`   Remaining: ${quotaUsage.remaining.toLocaleString()}`);
      console.log(`   Percentage: ${((quotaUsage.used / quotaUsage.total) * 100).toFixed(1)}%`);
    }

  } catch (error) {
    console.error('❌ Enrichment fix failed:', error);
    console.error('Error details:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the fix
console.log('🔧 YouTube Data Enrichment Fix Tool');
console.log('===================================');
console.log('This will use the YouTube API to properly enrich your videos with categories and channel information.\n');

fixEnrichment().catch(console.error); 