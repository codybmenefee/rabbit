import { WatchRecord } from './types'

export interface ParsedWatchEvent {
  videoId: string
  channelTitle?: string
  channelId?: string
  startedAt?: string
  watchedSeconds?: number
  raw: any
}

export class YouTubeHistoryParser {
  private html: string

  constructor(html: string) {
    this.html = html
  }

  async parse(): Promise<ParsedWatchEvent[]> {
    const events: ParsedWatchEvent[] = []

    // Try multiple parsing strategies
    try {
      // Strategy 1: Look for .content-cell divs (standard Takeout format)
      const contentCellRegex = /<div[^>]*class="[^"]*content-cell[^"]*"[^>]*>(.*?)<\/div>/g
      let match
      while ((match = contentCellRegex.exec(this.html)) !== null) {
        const cellContent = match[1]
        const event = this.parseContentCell(cellContent)
        if (event) {
          events.push(event)
          // Early exit if we have a lot of events to prevent memory issues
          if (events.length >= 10000) {
            break
          }
        }
      }

      // Strategy 2: If no events found, try outer container approach
      if (events.length === 0) {
        const outerCellRegex = /<div[^>]*class="[^"]*outer-cell[^"]*"[^>]*>(.*?)<\/div>/g
        let outerMatch
        while ((outerMatch = outerCellRegex.exec(this.html)) !== null) {
          const cellContent = outerMatch[1]
          const event = this.parseOuterCell(cellContent)
          if (event) {
            events.push(event)
            if (events.length >= 10000) {
              break
            }
          }
        }
      }

      // Strategy 3: Fallback regex-based extraction
      if (events.length === 0) {
        return this.fallbackRegexParse()
      }

    } catch (error) {
      console.error('Error parsing HTML:', error)
      return []
    }

    return events
  }

  // Streaming version that processes HTML in chunks
  async *parseStreaming(htmlStream: ReadableStream<Uint8Array>): AsyncGenerator<ParsedWatchEvent, void, unknown> {
    const reader = htmlStream.getReader()
    let buffer = ''
    let done = false

    try {
      while (!done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone

        if (value) {
          buffer += new TextDecoder().decode(value)

          // Process complete content-cell divs as we find them
          const contentCellRegex = /<div[^>]*class="[^"]*content-cell[^"]*"[^>]*>(.*?)<\/div>/g
          let match

          while ((match = contentCellRegex.exec(buffer)) !== null) {
            const cellContent = match[1]
            const event = this.parseContentCell(cellContent)
            if (event) {
              yield event
            }

            // Remove processed content from buffer to save memory
            buffer = buffer.slice(match.index + match[0].length)
            contentCellRegex.lastIndex = 0 // Reset regex state
          }

          // Prevent buffer from growing too large
          if (buffer.length > 10 * 1024 * 1024) { // 10MB limit
            buffer = buffer.slice(-5 * 1024 * 1024) // Keep last 5MB
          }
        }
      }

      // Process any remaining content in buffer
      const contentCellRegex = /<div[^>]*class="[^"]*content-cell[^"]*"[^>]*>(.*?)<\/div>/g
      let match
      while ((match = contentCellRegex.exec(buffer)) !== null) {
        const cellContent = match[1]
        const event = this.parseContentCell(cellContent)
        if (event) {
          yield event
        }
      }

    } finally {
      reader.releaseLock()
    }
  }

  private parseContentCell(content: string): ParsedWatchEvent | null {
    try {
      // Extract video title
      const titleMatch = content.match(/<a[^>]*href="[^"]*watch\?v=([^"&]+)[^"]*"[^>]*>([^<]+)<\/a>/)
      if (!titleMatch) return null

      const videoId = titleMatch[1]
      const videoTitle = titleMatch[2].trim()

      // Extract channel info
      const channelMatch = content.match(/<a[^>]*href="[^"]*(?:channel|user|c)\/([^"&]+)[^"]*"[^>]*>([^<]+)<\/a>/)
      const channelId = channelMatch ? channelMatch[1] : undefined
      const channelTitle = channelMatch ? channelMatch[2].trim() : undefined

      // Extract timestamp
      const timeMatch = content.match(/<br[^>]*>([^<]+(?:\d{1,2}:\d{2}:\d{2}[^<]*\d{4})[^<]*)</)
      let startedAt: string | undefined

      if (timeMatch) {
        startedAt = this.parseTimestamp(timeMatch[1].trim())
      }

      return {
        videoId,
        channelTitle,
        channelId,
        startedAt,
        raw: {
          videoTitle,
          channelTitle,
          channelId,
          timestamp: timeMatch ? timeMatch[1].trim() : undefined,
        }
      }
    } catch (error) {
      console.error('Error parsing content cell:', error)
      return null
    }
  }

  private parseOuterCell(content: string): ParsedWatchEvent | null {
    // Similar to content cell parsing but for different HTML structure
    return this.parseContentCell(content)
  }

  private fallbackRegexParse(): ParsedWatchEvent[] {
    const events: ParsedWatchEvent[] = []

    // Find all YouTube watch URLs
    const urlRegex = /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/g
    const titleRegex = /<a[^>]*href="[^"]*watch\?v=[^"]*"[^>]*>([^<]+)<\/a>/g

    const urls: string[] = []
    const titles: string[] = []

    let urlMatch
    while ((urlMatch = urlRegex.exec(this.html)) !== null) {
      urls.push(urlMatch[1])
    }

    let titleMatch
    while ((titleMatch = titleRegex.exec(this.html)) !== null) {
      titles.push(titleMatch[1].trim())
    }

    // Create events from matched URLs and titles
    for (let i = 0; i < Math.min(urls.length, titles.length); i++) {
      events.push({
        videoId: urls[i],
        raw: {
          videoTitle: titles[i],
        }
      })
    }

    return events
  }

  private parseTimestamp(timestampStr: string): string | undefined {
    try {
      // Clean up common issues
      const cleanStr = timestampStr
        .replace(/\u00A0/g, ' ') // Replace non-breaking spaces
        .replace(/\s+/g, ' ')
        .trim()

      // Try multiple date formats
      const formats = [
        // "Jun 23, 2025, 11:42:47 PM CDT"
        /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)\s+([A-Z]{3})$/,
        // "Jun 23, 2025, 11:42:47 PM"
        /^([A-Za-z]{3})\s+(\d{1,2}),\s+(\d{4}),\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)$/,
        // ISO format
        /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z?)$/,
      ]

      for (const format of formats) {
        const match = cleanStr.match(format)
        if (match) {
          let date: Date

          if (match.length === 8) {
            // Full format with timezone
            const [, month, day, year, hour, minute, second, ampm] = match
            const hour24 = ampm === 'PM' ? (parseInt(hour) % 12) + 12 : parseInt(hour) % 12
            date = new Date(`${month} ${day}, ${year} ${hour24}:${minute}:${second}`)
          } else if (match.length === 7) {
            // Format without timezone
            const [, month, day, year, hour, minute, second, ampm] = match
            const hour24 = ampm === 'PM' ? (parseInt(hour) % 12) + 12 : parseInt(hour) % 12
            date = new Date(`${month} ${day}, ${year} ${hour24}:${minute}:${second}`)
          } else {
            // ISO format
            date = new Date(match[1])
          }

          if (!isNaN(date.getTime())) {
            return date.toISOString()
          }
        }
      }

      // Fallback: try native Date parsing
      const fallbackDate = new Date(cleanStr)
      if (!isNaN(fallbackDate.getTime())) {
        return fallbackDate.toISOString()
      }

    } catch (error) {
      console.error('Error parsing timestamp:', timestampStr, error)
    }

    return undefined
  }
}
