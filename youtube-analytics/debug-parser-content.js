const fs = require('fs');
const { JSDOM } = require('jsdom');

// Mock DOMParser for Node.js environment
global.DOMParser = class DOMParser {
  parseFromString(htmlString, mimeType) {
    const dom = new JSDOM(htmlString);
    return dom.window.document;
  }
};

// Read the actual sample file
const filePath = './tests/fixtures/watch-history.sample.html';
const htmlContent = fs.readFileSync(filePath, 'utf-8');

console.log('Debugging timestamp extraction...\n');

const parser = new DOMParser();
const doc = parser.parseFromString(htmlContent, 'text/html');

// Look for content-cell divs like the parser does
const contentCells = Array.from(doc.querySelectorAll('.content-cell'));

console.log(`Found ${contentCells.length} content-cell elements\n`);

// Check first few content cells
contentCells.slice(0, 5).forEach((cell, index) => {
  const text = cell.textContent || '';
  const innerHTML = cell.innerHTML || '';
  
  console.log(`Content Cell ${index + 1}:`);
  console.log(`  Text Content: "${text.trim()}"`);
  console.log(`  innerHTML length: ${innerHTML.length}`);
  
  // Test the timestamp patterns manually
  const timestampPatterns = [
    /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,  // Jun 23, 2025, 11:42:47 PM CDT
    /(\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,   // Jun 23, 2025 11:42:47 PM CDT (no comma)
    /(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} \w{2})/      // MM/DD/YYYY, HH:MM:SS AM/PM
  ];
  
  let foundTimestamp = null;
  for (const pattern of timestampPatterns) {
    const match = text.match(pattern) || innerHTML.match(pattern);
    if (match) {
      foundTimestamp = match[1];
      console.log(`  Found timestamp: "${foundTimestamp}"`);
      break;
    }
  }
  
  if (!foundTimestamp) {
    console.log(`  No timestamp found`);
    // Look for any date-like patterns
    const anyDatePattern = /\w{3} \d{1,2}, \d{4}/;
    const dateMatch = text.match(anyDatePattern) || innerHTML.match(anyDatePattern);
    if (dateMatch) {
      console.log(`  Found partial date: "${dateMatch[0]}"`);
    }
    
    // Look for any time-like patterns  
    const anyTimePattern = /\d{1,2}:\d{2}:\d{2}/;
    const timeMatch = text.match(anyTimePattern) || innerHTML.match(anyTimePattern);
    if (timeMatch) {
      console.log(`  Found partial time: "${timeMatch[0]}"`);
    }
  }
  console.log('');
});