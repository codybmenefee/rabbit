const { YouTubeHistoryParser } = require('./lib/parser.ts');

// Test the timestamp parsing with actual data from your sample file
const testTimestamps = [
  'Jun 23, 2025, 11:42:47 PM CDT',
  'Jun 23, 2025, 11:42:36 PM CDT', 
  'Jun 23, 2025, 11:27:29 PM CDT',
  'Jun 23, 2025, 9:24:14 PM CDT',
  'Jun 23, 2025, 6:41:51 PM CDT',
  'Jun 23, 2025, 3:14:28 PM CDT',
  'Jun 23, 2025, 12:32:53 PM CDT'
];

const parser = new YouTubeHistoryParser();

console.log('Testing timestamp parsing...\n');

testTimestamps.forEach(timestamp => {
  console.log(`Input: "${timestamp}"`);
  
  try {
    // Test the normalizeRecord function with a mock parsed entry
    const mockParsed = {
      isAd: false,
      timestamp: timestamp,
      videoUrl: 'https://www.youtube.com/watch?v=test',
      videoTitle: 'Test Video',
      product: 'YouTube'
    };
    
    const result = parser.normalizeRecord(mockParsed);
    
    console.log(`  Parsed watchedAt: ${result.watchedAt}`);
    console.log(`  Year: ${result.year}, Month: ${result.month}, Hour: ${result.hour}`);
    console.log(`  YoyKey: ${result.yoyKey}`);
    console.log('');
  } catch (error) {
    console.log(`  ERROR: ${error.message}`);
    console.log('');
  }
});