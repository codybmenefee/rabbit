const { watchHistoryStorage } = require('./lib/storage.ts');

(async () => {
  try {
    const records = await watchHistoryStorage.getRecords();
    console.log('Total records:', records.length);
    console.log('Sample records (first 3):');
    records.slice(0, 3).forEach((r, i) => {
      console.log(`Record ${i + 1}:`, {
        id: r.id,
        watchedAt: r.watchedAt,
        rawTimestamp: r.rawTimestamp,
        videoTitle: r.videoTitle?.substring(0, 50) + '...',
        year: r.year,
        month: r.month
      });
    });
    
    console.log('\nTimestamp analysis:');
    const withTimestamps = records.filter(r => r.watchedAt !== null).length;
    const withRawTimestamps = records.filter(r => r.rawTimestamp).length;
    console.log('Records with watchedAt:', withTimestamps);
    console.log('Records with rawTimestamp:', withRawTimestamps);
    
  } catch (error) {
    console.error('Error:', error);
  }
})();