// Simple Node.js test for parsing validation
const fs = require('fs')
const { JSDOM } = require('jsdom')

// Mock DOMParser for Node.js environment
global.DOMParser = new JSDOM().window.DOMParser

// Mock the parser (simplified for testing)
function testTimestampExtraction() {
  // Sample HTML content from our file
  const sampleHTML = `
    <div class="outer-cell mdl-cell mdl-cell--12-col mdl-shadow--2dp">
      <div class="mdl-grid">
        <div class="header-cell mdl-cell mdl-cell--12-col">
          <p class="mdl-typography--title">YouTube<br></p>
        </div>
        <div class="content-cell mdl-cell mdl-cell--6-col mdl-typography--body-1">
          Watched <a href="https://www.youtube.com/watch?v=EzEp-Vr4Oao">https://www.youtube.com/watch?v=EzEp-Vr4Oao</a><br>Jun 23, 2025, 11:42:47 PM CDT
        </div>
      </div>
    </div>
  `

  const parser = new DOMParser()
  const doc = parser.parseFromString(sampleHTML, 'text/html')
  
  const entry = doc.querySelector('.outer-cell.mdl-cell.mdl-cell--12-col.mdl-shadow--2dp')
  const mainContent = entry.querySelector('.content-cell')
  const text = mainContent.textContent || ''
  const innerHTML = mainContent.innerHTML || ''
  
  console.log('🧪 Testing timestamp extraction...')
  console.log('Text content:', text)
  console.log('innerHTML:', innerHTML)
  
  // Test our timestamp patterns
  const timestampPatterns = [
    /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,  // Jun 23, 2025, 11:42:47 PM CDT
    /(\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,   // Jun 23, 2025 11:42:47 PM CDT (no comma)
    /(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} \w{2})/      // MM/DD/YYYY, HH:MM:SS AM/PM
  ]
  
  let foundTimestamp = null
  
  for (const pattern of timestampPatterns) {
    const match = text.match(pattern) || innerHTML.match(pattern)
    if (match) {
      foundTimestamp = match[1]
      console.log(`✅ Found timestamp with pattern: ${pattern}`)
      console.log(`✅ Extracted timestamp: ${foundTimestamp}`)
      break
    }
  }
  
  if (!foundTimestamp) {
    console.log('❌ No timestamp found with any pattern')
  }
  
  // Test date parsing
  if (foundTimestamp) {
    try {
      const date = new Date(foundTimestamp.replace(' CDT', '').replace(' CST', ''))
      if (!isNaN(date.getTime())) {
        console.log(`✅ Successfully parsed date: ${date.toISOString()}`)
      } else {
        console.log('❌ Failed to parse date')
      }
    } catch (error) {
      console.log('❌ Date parsing error:', error.message)
    }
  }
}

try {
  testTimestampExtraction()
} catch (error) {
  console.error('Test failed:', error)
}