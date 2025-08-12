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

// Read the actual sample file
const filePath = './tests/fixtures/watch-history.sample.html';
const htmlContent = fs.readFileSync(filePath, 'utf-8');

console.log('Testing parseEntry function...\n');

const parser = new YouTubeHistoryParser();
const dom = new DOMParser();
const doc = dom.parseFromString(htmlContent, 'text/html');

// Get the outer cells like the main parser does
const entryNodes = Array.from(
  doc.querySelectorAll('.outer-cell.mdl-cell.mdl-cell--12-col.mdl-shadow--2dp')
);

console.log(`Found ${entryNodes.length} outer-cell entries\n`);

// Test the first few entries with parseEntry
entryNodes.slice(0, 5).forEach((entry, index) => {
  console.log(`Entry ${index + 1}:`);
  
  // Simulate what parseEntry does
  let mainContent = entry;
  if (!entry.classList.contains('content-cell')) {
    const contentCells = entry.querySelectorAll('.content-cell');
    mainContent = contentCells.length > 0 ? contentCells[0] : entry;
  }
  
  const text = mainContent.textContent || '';
  const innerHTML = mainContent.innerHTML || '';
  
  console.log(`  Main content text: "${text.trim().substring(0, 100)}..."`);
  
  // Test timestamp patterns
  const timestampPatterns = [
    /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,
    /(\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,
    /(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} \w{2})/
  ];
  
  let foundTimestamp = null;
  for (const pattern of timestampPatterns) {
    const match = text.match(pattern) || innerHTML.match(pattern);
    if (match) {
      foundTimestamp = match[1];
      break;
    }
  }
  
  if (foundTimestamp) {
    console.log(`  ✓ Found timestamp: "${foundTimestamp}"`);
  } else {
    console.log(`  ✗ No timestamp found`);
    
    // Try the fallback patterns
    const datePattern = /(\w{3} \d{1,2}, \d{4})/;
    const timePattern = /(\d{1,2}:\d{2}:\d{2} \w{2} \w{3})/;
    
    const dateMatch = text.match(datePattern) || innerHTML.match(datePattern);
    const timeMatch = text.match(timePattern) || innerHTML.match(timePattern);
    
    if (dateMatch && timeMatch) {
      const combined = `${dateMatch[1]}, ${timeMatch[1]}`;
      console.log(`  ✓ Found with fallback: "${combined}"`);
    } else {
      console.log(`    Date part: ${dateMatch ? dateMatch[1] : 'none'}`);
      console.log(`    Time part: ${timeMatch ? timeMatch[1] : 'none'}`);
    }
  }
  
  console.log('');
});