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

const dom = new DOMParser();
const doc = dom.parseFromString(htmlContent, 'text/html');

// Get the first outer cell
const entryNodes = Array.from(
  doc.querySelectorAll('.outer-cell.mdl-cell.mdl-cell--12-col.mdl-shadow--2dp')
);

const firstEntry = entryNodes[0];
const contentCells = firstEntry.querySelectorAll('.content-cell');
const mainContent = contentCells.length > 0 ? contentCells[0] : firstEntry;

const text = mainContent.textContent || '';

console.log('Raw text from first cell:');
console.log(`"${text}"`);
console.log('');

console.log('Character codes around timestamp area:');
const chars = Array.from(text);
chars.forEach((char, index) => {
  if (index > 70 && index < 110) {
    console.log(`${index}: "${char}" (${char.charCodeAt(0)})`);
  }
});

console.log('');

// Test patterns again with actual text
const timestampPattern = /(\d{1,2}:\d{2}:\d{2} \w{2} \w{3})/;
const match = text.match(timestampPattern);
console.log('Pattern match:', match ? match[1] : 'none');

// Test each component separately
const timeOnlyPattern = /(\d{1,2}:\d{2}:\d{2})/;
const ampmPattern = /(\w{2})/;
const timezonePattern = /(\w{3})/;

const timeMatch = text.match(timeOnlyPattern);
const ampmMatch = text.match(ampmPattern);
const timezoneMatch = text.match(timezonePattern);

console.log('Time only:', timeMatch ? timeMatch[1] : 'none');
console.log('AM/PM:', ampmMatch ? ampmMatch[1] : 'none');
console.log('Timezone:', timezoneMatch ? timezoneMatch[1] : 'none');

// Look for the exact substring we expect
const expectedTime = '11:42:47 PM CDT';
const indexOf = text.indexOf(expectedTime);
console.log('');
console.log(`Looking for "${expectedTime}"`);
console.log('Found at index:', indexOf);

if (indexOf >= 0) {
  const substring = text.substring(indexOf - 5, indexOf + expectedTime.length + 5);
  console.log('Context:', `"${substring}"`);
}