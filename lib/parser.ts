import { WatchRecord } from './types'

export interface ParsedWatchEvent {
  videoId: string
  videoUrl?: string
  channelTitle?: string
  channelId?: string
  channelUrl?: string
  startedAt?: string
  watchedSeconds?: number
  raw: any
}

const TZ_OFFSETS: Record<string, number> = {
  UTC: 0, GMT: 0,
  PST: -8, PDT: -7,
  MST: -7, MDT: -6,
  CST: -6, CDT: -5,
  EST: -5, EDT: -4,
}

function toIsoWithZone(year: number, monthIndex: number, day: number, hour12: number, min: number, sec: number, ampm?: string, tzAbbr?: string) {
  const hour = ampm ? ((hour12 % 12) + (ampm.toUpperCase() === 'PM' ? 12 : 0)) : hour12
  const dt = new Date(Date.UTC(year, monthIndex, day, hour, min, sec))
  if (tzAbbr && TZ_OFFSETS[tzAbbr]) {
    const offset = TZ_OFFSETS[tzAbbr]
    // Convert from local-with-zone to UTC by subtracting the offset
    dt.setUTCHours(dt.getUTCHours() - offset)
  }
  return dt.toISOString()
}

function parseWatchTimestamp(line: string): string | undefined {
  const clean = line.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim()
  // Example: Aug 15, 2025, 11:04:01 AM CDT
  const full = clean.match(/^([A-Za-z]{3,9}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?\s*([A-Z]{2,4})?$/)
  if (full) {
    const [, mon, day, year, hh, mm, ss, ampm, tz] = full
    const monthIndex = new Date(`${mon} 1, 2000`).getMonth()
    return toIsoWithZone(+year, monthIndex, +day, +hh, +mm, +ss, ampm, tz)
  }
  // ISO passthrough
  const iso = clean.match(/^\d{4}-\d{2}-\d{2}T/)
  if (iso) {
    const d = new Date(clean)
    if (!isNaN(d.getTime())) return d.toISOString()
  }
  // Fallback: try native Date (last resort)
  const d = new Date(clean)
  if (!isNaN(d.getTime())) return d.toISOString()
  return undefined
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
      // Video URL + ID + Title
      const videoAnchor = content.match(/<a[^>]*href="([^"]*watch\?v=([^"&]+)[^"]*)"[^>]*>([^<]+)<\/a>/i)
      if (!videoAnchor) return null
      const videoUrl = videoAnchor[1]
      const videoId = videoAnchor[2]
      const videoTitle = videoAnchor[3].trim()

      // Channel URL + Title + Id (when /channel/UC...)
      const channelAnchor = content.match(/<a[^>]*href="https?:\/\/(?:www\.)?youtube\.com\/(channel|user|c)\/([^"?#/]+)[^"]*"[^>]*>([^<]+)<\/a>/i)
      const channelKind = channelAnchor?.[1]
      const channelSlug = channelAnchor?.[2]
      const channelTitle = channelAnchor?.[3]?.trim()
      const channelUrl = channelAnchor ? `https://www.youtube.com/${channelKind}/${channelSlug}` : undefined
      const channelId = channelKind === 'channel' ? channelSlug : undefined

      // Timestamp: prefer full date-time lines
      // e.g., Aug 15, 2025, 11:04:01 AM CDT
      const fullTsMatch = content.match(/([A-Za-z]{3,9}[\s\u00A0]+\d{1,2},[\s\u00A0]+\d{4},[\s\u00A0]+\d{1,2}:\d{2}:\d{2}[\s\u00A0]*(?:AM|PM)?(?:[\s\u00A0]+[A-Z]{2,4})?)/)
      let startedAt = fullTsMatch ? parseWatchTimestamp(fullTsMatch[1]) : undefined

      // Fallback: "Watched at 11:42 PM" + nearby date line
      if (!startedAt) {
        const watchedAt = content.match(/Watched at\s+(\d{1,2}:\d{2}\s?(AM|PM))/i)
        const dateOnly = content.match(/([A-Za-z]{3,9}\s+\d{1,2},\s+\d{4})/)
        if (watchedAt && dateOnly) {
          const line = `${dateOnly[1]}, ${watchedAt[1]}`
          startedAt = parseWatchTimestamp(line)
        }
      }

      return {
        videoId,
        videoUrl,
        channelTitle,
        channelId,
        channelUrl,
        startedAt,
        raw: {
          videoTitle,
          channelTitle,
          channelUrl,
          originalTimestamp: fullTsMatch?.[1],
        },
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

}
