const fs = require('fs');
const path = require('path');

// Mock DOM environment
const { JSDOM } = require('jsdom');
const dom = new JSDOM();
global.DOMParser = dom.window.DOMParser;

const { YouTubeHistoryParser } = require('./lib/parser.ts');

async function testParser() {
  try {
    const htmlPath = path.join(__dirname, 'tests/fixtures/mini-watch-history.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    console.log('Testing parser with sample HTML...');
    
    const parser = new YouTubeHistoryParser();
    const records = parser.parseHTML(htmlContent);
    
    console.log(`Parsed ${records.length} records:`);
    
    records.forEach((record, i) => {
      console.log(`\nRecord ${i + 1}:`);
      console.log('  watchedAt:', record.watchedAt);
      console.log('  rawTimestamp:', record.rawTimestamp);
      console.log('  videoTitle:', record.videoTitle);
      console.log('  year/month:', record.year, record.month);
      console.log('  channelTitle:', record.channelTitle);
    });
    
    // Test timestamp parsing specifically
    console.log('\n--- Testing timestamp patterns ---');
    const testTimestamps = [
      'Jan 1, 2024, 12:00:00 PM PST',
      'Jan 2, 2024, 1:30:00 PM PST',
      'Dec 25, 2023, 11:45:30 PM EST'
    ];
    
    testTimestamps.forEach(ts => {
      const testRecord = { isAd: false, timestamp: ts };
      const normalized = parser.normalizeRecord(testRecord);
      console.log(`"${ts}" -> watchedAt: ${normalized?.watchedAt}, year: ${normalized?.year}`);
    });
    
  } catch (error) {
    console.error('Error testing parser:', error);
  }
}

testParser();