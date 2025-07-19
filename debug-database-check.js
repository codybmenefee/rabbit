const mongoose = require('mongoose');

// Connect to MongoDB Atlas (from .env file)
async function connectToDatabase() {
  try {
    await mongoose.connect('mongodb+srv://codybmenefee:mollys@cluster0.kxya0vs.mongodb.net/rabbit-analytics?retryWrites=true&w=majority&appName=Cluster0', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB Atlas');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
}

// Define VideoEntry schema (simplified)
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
  tags: [String]
}, { collection: 'video_entries' });

const VideoEntry = mongoose.model('VideoEntry', videoEntrySchema);

async function checkDatabase() {
  await connectToDatabase();
  
  try {
    // Get total count
    const totalCount = await VideoEntry.countDocuments();
    console.log(`\n📊 Total videos in database: ${totalCount}`);
    
    // Check enrichment status
    const enrichedCount = await VideoEntry.countDocuments({ enrichedWithAPI: true });
    const enrichmentRate = (enrichedCount / totalCount * 100).toFixed(1);
    console.log(`✨ Enriched videos: ${enrichedCount} (${enrichmentRate}%)`);
    
    // Check channel information
    const unknownChannelCount = await VideoEntry.countDocuments({ 
      $or: [
        { channel: 'Unknown Channel' },
        { channel: { $exists: false } },
        { channel: null },
        { channel: '' }
      ]
    });
    console.log(`❓ Videos with unknown channel: ${unknownChannelCount}`);
    
    // Check category information
    const unknownCategoryCount = await VideoEntry.countDocuments({ 
      $or: [
        { category: 'Unknown' },
        { category: { $exists: false } },
        { category: null },
        { category: '' }
      ]
    });
    console.log(`📂 Videos with unknown category: ${unknownCategoryCount}`);
    
    // Sample of enriched videos
    console.log(`\n🔍 Sample of enriched videos:`);
    const enrichedSamples = await VideoEntry.find({ enrichedWithAPI: true })
      .limit(5)
      .select('title channel category duration viewCount enrichedWithAPI lastUpdated');
    
    enrichedSamples.forEach((video, index) => {
      console.log(`  ${index + 1}. "${video.title.substring(0, 50)}..."`);
      console.log(`     Channel: ${video.channel || 'N/A'}`);
      console.log(`     Category: ${video.category || 'N/A'}`);
      console.log(`     Duration: ${video.duration || 'N/A'}s`);
      console.log(`     Views: ${video.viewCount || 'N/A'}`);
      console.log(`     Last Updated: ${video.lastUpdated}`);
      console.log('');
    });
    
    // Sample of non-enriched videos
    console.log(`🔍 Sample of non-enriched videos:`);
    const nonEnrichedSamples = await VideoEntry.find({ 
      $or: [
        { enrichedWithAPI: false },
        { enrichedWithAPI: { $exists: false } }
      ]
    })
      .limit(5)
      .select('title channel category enrichedWithAPI');
    
    nonEnrichedSamples.forEach((video, index) => {
      console.log(`  ${index + 1}. "${video.title.substring(0, 50)}..."`);
      console.log(`     Channel: ${video.channel || 'N/A'}`);
      console.log(`     Category: ${video.category || 'N/A'}`);
      console.log(`     Enriched: ${video.enrichedWithAPI || false}`);
      console.log('');
    });
    
    // Check recent updates
    const recentlyUpdated = await VideoEntry.find({
      lastUpdated: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
    }).countDocuments();
    console.log(`🕒 Videos updated in last hour: ${recentlyUpdated}`);
    
    // Check specific fields distribution
    const channelStats = await VideoEntry.aggregate([
      { $group: { _id: '$channel', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    console.log(`\n📊 Top channels by video count:`);
    channelStats.forEach((stat, index) => {
      console.log(`  ${index + 1}. ${stat._id || 'Unknown'}: ${stat.count} videos`);
    });
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the check
checkDatabase().catch(console.error); 