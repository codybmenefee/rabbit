// Debug the parseEntry method to find where cross-contamination occurs
const fs = require('fs')
const path = require('path')

// Mock DOMParser for Node.js testing
global.DOMParser = class DOMParser {
  parseFromString(str, mimeType) {
    return {
      querySelectorAll: (selector) => {
        if (selector === '.content-cell') {
          // Extract content cells manually
          const cells = []
          const cellRegex = /<div class="content-cell[^>]*>([\s\S]*?)<\/div>/g
          let match
          while ((match = cellRegex.exec(str)) !== null) {
            const content = match[1]
            cells.push({
              textContent: content.replace(/<[^>]*>/g, ''),
              innerHTML: content,
              querySelector: (sel) => {
                if (sel.includes('youtube.com/watch')) {
                  const linkMatch = content.match(/<a[^>]+href="([^"]*youtube\.com\/watch[^"]*)"[^>]*>([^<]*)<\/a>/)
                  if (linkMatch) {
                    return {
                      getAttribute: (attr) => attr === 'href' ? linkMatch[1] : null,
                      textContent: linkMatch[2]
                    }
                  }
                }
                if (sel.includes('youtube.com/channel') || sel.includes('youtube.com/@')) {
                  const channelMatch = content.match(/<a[^>]+href="([^"]*youtube\.com\/(?:channel|@)[^"]*)"[^>]*>([^<]*)<\/a>/)
                  if (channelMatch) {
                    return {
                      getAttribute: (attr) => attr === 'href' ? channelMatch[1] : null,
                      textContent: channelMatch[2]
                    }
                  }
                }
                return null
              }
            })
          }
          return cells
        }
        return []
      }
    }
  }
}

const { YouTubeHistoryParserCore } = require('./lib/parser-core.ts')

async function debugParseEntry() {
  console.log('🔍 DEBUGGING parseEntry METHOD\n')
  
  // Create parser instance
  const parser = new YouTubeHistoryParserCore()
  
  // Read the HTML fixture
  const samplePath = path.join(__dirname, 'tests/fixtures/current-dates-sample.html')
  const sampleHTML = fs.readFileSync(samplePath, 'utf8')
  
  // Parse HTML to get content cells
  const doc = new DOMParser().parseFromString(sampleHTML, 'text/html')
  const contentCells = doc.querySelectorAll('.content-cell')
  
  console.log(`Found ${contentCells.length} content cells\n`)
  
  // Test each content cell individually
  contentCells.forEach((cell, i) => {
    console.log(`=== Content Cell ${i + 1} ===`)
    console.log(`Raw innerHTML: ${cell.innerHTML}`)
    console.log(`Text content: ${cell.textContent}`)
    
    // Extract timestamp using our resilient extractor
    const { extractTimestamp } = require('./lib/resilient-timestamp-extractor.ts')
    const result = extractTimestamp(cell.textContent, cell.innerHTML, { debug: true })
    
    console.log(`Extracted raw timestamp: "${result.rawTimestamp}"`)
    console.log(`Parsed timestamp: ${result.timestamp}`)
    console.log(`Strategy: ${result.strategy}`)
    
    if (result.debugInfo) {
      console.log(`Debug attempts:`)
      result.debugInfo.attempts.forEach((attempt, j) => {
        console.log(`  ${j + 1}. ${attempt.strategy}: ${attempt.result}${attempt.error ? ` (${attempt.error})` : ''}`)
      })
    }
    console.log()
  })
  
  console.log('\n=== FULL PARSER TEST ===')
  
  // Now test the full parser
  const records = await parser.parseHTML(sampleHTML)
  
  console.log(`Parser returned ${records.length} records:`)
  records.forEach((record, i) => {
    console.log(`Record ${i + 1}: "${record.videoTitle}" - raw: "${record.rawTimestamp}" - parsed: ${record.watchedAt}`)
  })
}

debugParseEntry().catch(console.error)