const mongoose = require('mongoose');

// Define VideoEntry schema
const videoEntrySchema = new mongoose.Schema({
  url: { type: String, required: true },
  title: { type: String, required: true },
  channel: { type: String, default: 'Unknown Channel' },
  channelId: String,
  category: { type: String, default: 'Unknown' },
  watchedAt: { type: Date, required: true },
  enrichedWithAPI: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
  description: String,
  duration: Number,
  viewCount: Number,
  tags: [String],
  videoId: String
}, { collection: 'videoentries' });

const VideoEntry = mongoose.model('VideoEntry', videoEntrySchema);

async function testDatabaseOperations() {
  try {
    // Connect to database
    console.log('🔌 Connecting to MongoDB Atlas...');
    await mongoose.connect('mongodb+srv://codybmenefee:mollys@cluster0.kxya0vs.mongodb.net/rabbit-analytics?retryWrites=true&w=majority&appName=Cluster0');
    console.log('✅ Connected to MongoDB Atlas');

    // Test 1: Check connection
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📂 Collections in database:`, collections.map(c => c.name));

    // Test 2: Create a test video entry
    console.log('\n📝 Testing video entry creation...');
    const testVideo = new VideoEntry({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Test Video - Never Gonna Give You Up',
      channel: 'Rick Astley',
      channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
      category: 'Music',
      watchedAt: new Date(),
      enrichedWithAPI: true,
      description: 'Test video for database connectivity',
      duration: 212,
      viewCount: 1000000,
      tags: ['music', 'pop', 'test'],
      videoId: 'dQw4w9WgXcQ'
    });

    const savedVideo = await testVideo.save();
    console.log('✅ Test video saved successfully:', {
      id: savedVideo._id,
      title: savedVideo.title,
      channel: savedVideo.channel,
      category: savedVideo.category
    });

    // Test 3: Bulk upsert operation (like the real processing does)
    console.log('\n📦 Testing bulk upsert operation...');
    const bulkVideos = [
      {
        url: 'https://www.youtube.com/watch?v=test1',
        title: 'Test Video 1',
        channel: 'Test Channel 1',
        category: 'Entertainment',
        watchedAt: new Date(),
        enrichedWithAPI: true,
        videoId: 'test1'
      },
      {
        url: 'https://www.youtube.com/watch?v=test2',
        title: 'Test Video 2',
        channel: 'Test Channel 2',
        category: 'Gaming',
        watchedAt: new Date(),
        enrichedWithAPI: true,
        videoId: 'test2'
      }
    ];

    // Prepare bulk operations like the VideoService does
    const bulkOps = bulkVideos.map(video => ({
      updateOne: {
        filter: { videoId: video.videoId },
        update: {
          $set: {
            ...video,
            lastUpdated: new Date()
          }
        },
        upsert: true
      }
    }));

    const bulkResult = await VideoEntry.bulkWrite(bulkOps, {
      ordered: false,
      writeConcern: { w: 'majority' }
    });

    console.log('✅ Bulk upsert completed:', {
      upsertedCount: bulkResult.upsertedCount,
      modifiedCount: bulkResult.modifiedCount,
      matchedCount: bulkResult.matchedCount
    });

    // Test 4: Verify data was saved
    console.log('\n🔍 Verifying saved data...');
    const totalCount = await VideoEntry.countDocuments();
    const enrichedCount = await VideoEntry.countDocuments({ enrichedWithAPI: true });
    
    console.log(`📊 Total videos now in database: ${totalCount}`);
    console.log(`✨ Enriched videos: ${enrichedCount}`);

    // Test 5: Sample the saved data
    const samples = await VideoEntry.find().limit(5).select('title channel category enrichedWithAPI');
    console.log('\n📋 Sample of saved videos:');
    samples.forEach((video, index) => {
      console.log(`  ${index + 1}. "${video.title}"`);
      console.log(`     Channel: ${video.channel}`);
      console.log(`     Category: ${video.category}`);
      console.log(`     Enriched: ${video.enrichedWithAPI}`);
      console.log('');
    });

    // Test 6: Clean up test data
    console.log('🧹 Cleaning up test data...');
    const deleteResult = await VideoEntry.deleteMany({
      $or: [
        { videoId: { $in: ['dQw4w9WgXcQ', 'test1', 'test2'] } },
        { url: { $regex: /test/ } }
      ]
    });
    console.log(`🗑️  Deleted ${deleteResult.deletedCount} test videos`);

    console.log('\n🎉 All database tests passed! Database operations are working correctly.');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    
    // More detailed error information
    if (error.name === 'MongooseError') {
      console.error('   This is a Mongoose-specific error');
    } else if (error.name === 'MongoError') {
      console.error('   This is a MongoDB-specific error');
    }
    
    console.error('   Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    });
  } finally {
    await mongoose.disconnect();
    console.log('📡 Disconnected from MongoDB');
  }
}

// Run the test
console.log('🧪 Starting database connectivity and operations test...\n');
testDatabaseOperations().catch(console.error); 