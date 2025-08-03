const mongoose = require('mongoose');

// Define VideoEntry schema
const videoEntrySchema = new mongoose.Schema({
  url: String,
  title: String,
  channel: String,
  channelId: String,
  category: String,
  watchedAt: Date,
  enrichedWithAPI: Boolean,
  lastUpdated: Date,
  description: String,
  duration: Number,
  viewCount: Number,
  tags: [String],
  videoId: String
}, { collection: 'video_entries' });

const VideoEntry = mongoose.model('VideoEntry', videoEntrySchema);

async function checkUserData() {
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect('mongodb+srv://codybmenefee:mollys@cluster0.kxya0vs.mongodb.net/rabbit-analytics?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to MongoDB Atlas');

    // Get comprehensive stats
    const totalCount = await VideoEntry.countDocuments();
    console.log(`\n📊 Total videos in database: ${totalCount.toLocaleString()}`);
    
    // Check enrichment status
    const enrichedCount = await VideoEntry.countDocuments({ enrichedWithAPI: true });
    const enrichmentRate = totalCount > 0 ? (enrichedCount / totalCount * 100).toFixed(1) : '0';
    console.log(`✨ Enriched videos: ${enrichedCount.toLocaleString()} (${enrichmentRate}%)`);
    
    // Check recent uploads (videos added in last few hours)
    const recentVideos = await VideoEntry.find({
      lastUpdated: { $gte: new Date(Date.now() - 4 * 60 * 60 * 1000) } // Last 4 hours
    }).countDocuments();
    console.log(`🕒 Videos added in last 4 hours: ${recentVideos.toLocaleString()}`);
    
    // Channel analysis
    const unknownChannelCount = await VideoEntry.countDocuments({ 
      $or: [
        { channel: 'Unknown Channel' },
        { channel: { $exists: false } },
        { channel: null },
        { channel: '' }
      ]
    });
    console.log(`❓ Videos with unknown channel: ${unknownChannelCount.toLocaleString()}`);
    
    // Category analysis  
    const unknownCategoryCount = await VideoEntry.countDocuments({ 
      $or: [
        { category: 'Unknown' },
        { category: { $exists: false } },
        { category: null },
        { category: '' }
      ]
    });
    console.log(`📂 Videos with unknown category: ${unknownCategoryCount.toLocaleString()}`);
    
    // Find videos that have detailed information (successful enrichment)
    const detailedVideos = await VideoEntry.find({
      $and: [
        { channel: { $ne: 'Unknown Channel' } },
        { category: { $ne: 'Unknown' } },
        { duration: { $exists: true, $gt: 0 } }
      ]
    }).countDocuments();
    console.log(`🎯 Videos with detailed info: ${detailedVideos.toLocaleString()}`);
    
    // Sample of recent videos to see what the data looks like
    console.log(`\n📋 Sample of most recent videos:`);
    const recentSamples = await VideoEntry.find()
      .sort({ lastUpdated: -1 })
      .limit(10)
      .select('title channel category enrichedWithAPI duration viewCount lastUpdated');
    
    recentSamples.forEach((video, index) => {
      console.log(`  ${index + 1}. "${video.title.substring(0, 60)}${video.title.length > 60 ? '...' : ''}"`);
      console.log(`     Channel: ${video.channel || 'N/A'}`);
      console.log(`     Category: ${video.category || 'N/A'}`);
      console.log(`     Duration: ${video.duration || 'N/A'}s`);
      console.log(`     Views: ${video.viewCount || 'N/A'}`);
      console.log(`     Enriched: ${video.enrichedWithAPI || false}`);
      console.log(`     Updated: ${video.lastUpdated}`);
      console.log('');
    });
    
    // Top channels by count
    const channelStats = await VideoEntry.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);
    
    console.log(`📊 Top channels by video count:`);
    channelStats.forEach((stat, index) => {
      console.log(`  ${index + 1}. ${stat._id || 'Unknown'}: ${stat.count.toLocaleString()} videos`);
    });
    
    // Check if there are any videos with actual enrichment data
    const enrichedSample = await VideoEntry.findOne({ 
      enrichedWithAPI: true,
      duration: { $exists: true, $gt: 0 }
    });
    
    if (enrichedSample) {
      console.log(`\n✨ Example of successfully enriched video:`);
      console.log(`   Title: "${enrichedSample.title}"`);
      console.log(`   Channel: ${enrichedSample.channel}`);
      console.log(`   Category: ${enrichedSample.category}`);
      console.log(`   Duration: ${enrichedSample.duration}s`);
      console.log(`   Views: ${enrichedSample.viewCount || 'N/A'}`);
      console.log(`   Description: ${enrichedSample.description ? enrichedSample.description.substring(0, 100) + '...' : 'N/A'}`);
    } else {
      console.log(`\n❌ No successfully enriched videos found`);
      console.log(`   This confirms that the high-performance scraping didn't work properly`);
    }

  } catch (error) {
    console.error('❌ Error checking user data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run the check
checkUserData().catch(console.error); 