const fs = require('fs');
const path = require('path');

// Read the sample file
const samplePath = path.join(__dirname, 'tests/fixtures/watch-history.sample.html');
const htmlContent = fs.readFileSync(samplePath, 'utf8');

// Simple test to check timestamp parsing
const timestampPatterns = [
  /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/g,
  /(\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/g,
];

console.log('🔍 Searching for timestamps in sample file...\n');

let foundTimestamps = [];
for (const pattern of timestampPatterns) {
  const matches = htmlContent.match(pattern);
  if (matches) {
    foundTimestamps = foundTimestamps.concat(matches);
  }
}

console.log(`Found ${foundTimestamps.length} timestamps\n`);

// Test parsing each timestamp
console.log('Testing timestamp parsing:\n');
foundTimestamps.slice(0, 5).forEach((ts, i) => {
  console.log(`${i + 1}. Original: "${ts}"`);
  
  // Apply the same sanitization as in parser
  const sanitized = ts
    .replace(/\u202F|\u00A0/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s(CDT|CST|PDT|PST|EDT|EST|UTC|GMT)\b/gi, '')
    .replace(/\s(AM|PM)\b/gi, (m) => m.toUpperCase())
    .trim();
  
  console.log(`   Sanitized: "${sanitized}"`);
  
  const date = new Date(sanitized);
  if (!isNaN(date.getTime())) {
    console.log(`   ✅ Parsed successfully: ${date.toISOString()}`);
  } else {
    console.log(`   ❌ Failed to parse`);
  }
  console.log('');
});