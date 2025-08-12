// Test the new patterns manually
const testText = "Watched https://www.youtube.com/watch?v=EzEp-Vr4OaoJun 23, 2025, 11:42:47 PM CDT";

console.log('Testing text:', testText);

// Original patterns
const timestampPatterns = [
  /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,  // Jun 23, 2025, 11:42:47 PM CDT
  /(\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,   // Jun 23, 2025 11:42:47 PM CDT (no comma)
  /(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} \w{2})/      // MM/DD/YYYY, HH:MM:SS AM/PM
];

console.log('\nTesting original patterns:');
for (const pattern of timestampPatterns) {
  const match = testText.match(pattern);
  if (match) {
    console.log(`  Found with pattern: ${pattern}`);
    console.log(`  Timestamp: "${match[1]}"`);
  }
}

// New flexible patterns
console.log('\nTesting flexible patterns:');
const datePattern = /(\w{3} \d{1,2}, \d{4})/;
const timePattern = /(\d{1,2}:\d{2}:\d{2} \w{2} \w{3})/;

const dateMatch = testText.match(datePattern);
const timeMatch = testText.match(timePattern);

console.log(`  Date match: ${dateMatch ? dateMatch[1] : 'none'}`);
console.log(`  Time match: ${timeMatch ? timeMatch[1] : 'none'}`);

if (dateMatch && timeMatch) {
  const combined = `${dateMatch[1]}, ${timeMatch[1]}`;
  console.log(`  Combined: "${combined}"`);
}