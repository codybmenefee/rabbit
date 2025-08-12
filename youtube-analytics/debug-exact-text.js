const testText = "Watched https://www.youtube.com/watch?v=EzEp-Vr4OaoJun 23, 2025, 11:42:47 PM CDT";

console.log('Full text:', testText);
console.log('');

// Test various time patterns
const patterns = [
  /(\d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,           // expecting 3-char timezone
  /(\d{1,2}:\d{2}:\d{2} \w{2} \w+)/,             // any timezone length
  /(\d{1,2}:\d{2}:\d{2} \w{2})/,                 // no timezone
  /(11:42:47 PM CDT)/,                           // exact match
  /(11:42:47 PM)/,                               // exact without timezone
];

patterns.forEach((pattern, index) => {
  const match = testText.match(pattern);
  console.log(`Pattern ${index + 1}: ${pattern}`);
  console.log(`  Match: ${match ? match[1] : 'none'}`);
  console.log('');
});

// Check if CDT is 3 characters
console.log('CDT length:', 'CDT'.length);

// Test word boundary
const wordTest = testText.match(/(\w{3})/g);
console.log('All 3-character word matches:', wordTest);