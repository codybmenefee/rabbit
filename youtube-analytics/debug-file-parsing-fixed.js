const fs = require('fs');
const { JSDOM } = require('jsdom');

// Mock DOMParser for Node.js environment
global.DOMParser = class DOMParser {
  parseFromString(htmlString, mimeType) {
    const dom = new JSDOM(htmlString);
    return dom.window.document;
  }
};

const { YouTubeHistoryParser } = require('./lib/parser.ts');

// Read the actual sample file and test parsing
const filePath = './tests/fixtures/watch-history.sample.html';
const htmlContent = fs.readFileSync(filePath, 'utf-8');

console.log('Reading file:', filePath);
console.log('File size:', Math.round(htmlContent.length / 1024 / 1024 * 100) / 100, 'MB');

const parser = new YouTubeHistoryParser();
console.log('\nParsing HTML content...');

const records = parser.parseHTML(htmlContent);

console.log(`\nTotal records found: ${records.length}`);

// Check first 10 records
console.log('\nFirst 10 records:');
records.slice(0, 10).forEach((record, index) => {
  console.log(`Record ${index + 1}:`);
  console.log(`  ID: ${record.id}`);
  console.log(`  Video Title: ${record.videoTitle?.substring(0, 50)}...`);
  console.log(`  Channel: ${record.channelTitle}`);
  console.log(`  Raw Timestamp: ${record.rawTimestamp}`);
  console.log(`  Parsed watchedAt: ${record.watchedAt}`);
  console.log(`  Year: ${record.year}, Month: ${record.month}, Hour: ${record.hour}`);
  console.log('');
});

// Count records with valid timestamps
const withTimestamps = records.filter(r => r.watchedAt !== null).length;
const withoutTimestamps = records.filter(r => r.watchedAt === null).length;

console.log(`\nTimestamp Analysis:`);
console.log(`  Records with timestamps: ${withTimestamps}`);
console.log(`  Records without timestamps: ${withoutTimestamps}`);
console.log(`  Success rate: ${Math.round(withTimestamps / records.length * 100)}%`);

// Show some records without timestamps for debugging
const noTimestampRecords = records.filter(r => r.watchedAt === null).slice(0, 5);
console.log(`\nSample records without timestamps:`);
noTimestampRecords.forEach((record, index) => {
  console.log(`Record ${index + 1}:`);
  console.log(`  Video Title: ${record.videoTitle}`);
  console.log(`  Raw Timestamp: ${record.rawTimestamp}`);
  console.log('')
});