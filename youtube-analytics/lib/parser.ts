import { WatchRecord, ParsedEntry, ImportSummary } from '@/types/records'

export class YouTubeHistoryParser {
  private topicKeywords: Record<string, string[]> = {
    tech: ['ai', 'programming', 'coding', 'software', 'developer', 'tech', 'computer', 'startup'],
    business: ['business', 'finance', 'economy', 'market', 'startup', 'entrepreneur', 'investing'],
    entertainment: ['music', 'movie', 'game', 'gaming', 'comedy', 'entertainment', 'funny'],
    education: ['tutorial', 'learn', 'course', 'education', 'explained', 'how to', 'guide'],
    news: ['news', 'politics', 'current', 'breaking', 'update', 'report'],
    health: ['fitness', 'health', 'workout', 'nutrition', 'medical', 'wellness'],
    science: ['science', 'physics', 'chemistry', 'biology', 'research', 'study'],
    lifestyle: ['lifestyle', 'vlog', 'daily', 'routine', 'travel', 'food', 'cooking']
  }

  parseHTML(htmlContent: string): WatchRecord[] {
    const parser = new DOMParser()
    const doc = parser.parseFromString(htmlContent, 'text/html')

    const records: WatchRecord[] = []

    // Primary: Google Takeout classic structure - look for content-cell divs directly
    const contentCells: Element[] = Array.from(
      doc.querySelectorAll('.content-cell')
    )

    // If we found content-cells, parse each one as a separate entry
    if (contentCells.length > 0) {
      for (const contentCell of contentCells) {
        const parsed = this.parseEntry(contentCell)
        if (parsed && !parsed.isAd) {
          const normalized = this.normalizeRecord(parsed)
          if (normalized) {
            records.push(normalized)
          }
        }
      }
    } else {
      // Fallback: Look for outer containers if no content-cells found
      let entryNodes: Element[] = Array.from(
        doc.querySelectorAll('.outer-cell.mdl-cell.mdl-cell--12-col.mdl-shadow--2dp')
      )

      // Fallback: more generic scan when classes differ or minified
      if (entryNodes.length === 0) {
        const watchLinks = Array.from(
          doc.querySelectorAll('a[href*="youtube.com/watch"]')
        ) as Element[]

        // Use nearest container div for each link to avoid duplicates
        const containerSet = new Set<Element>()
        for (const link of watchLinks) {
          const container = (link.closest('div') as Element | null) || (link.parentElement as Element | null) || link
          if (container) containerSet.add(container)
        }
        entryNodes = Array.from(containerSet)
      }

      for (const entry of entryNodes) {
        const parsed = this.parseEntry(entry)
        if (parsed && !parsed.isAd) {
          const normalized = this.normalizeRecord(parsed)
          if (normalized) {
            records.push(normalized)
          }
        }
      }
    }

    // If DOM-based parsing failed to produce any records, try a regex-based fallback
    if (records.length === 0) {
      const regexRecords = this.parseWithRegexFallback(htmlContent)
      return regexRecords
    }

    return records
  }

  // Fallback when DOM structure is unrecognized or minified into single line
  private parseWithRegexFallback(html: string): WatchRecord[] {
    const records: WatchRecord[] = []

    // Match YouTube watch links and extract anchor text as title when present
    const watchLinkRegex = /<a[^>]+href=\"([^\"]*youtube\.com\/(?:watch\?[^\"]*v=[^\"&]+|shorts\/[^\"?&]+)[^\"]*)\"[^>]*>([\s\S]*?)<\/a>/gi
    let match: RegExpExecArray | null

    // Use a set to avoid duplicate URLs
    const seenUrls = new Set<string>()
    while ((match = watchLinkRegex.exec(html)) !== null) {
      const videoUrl = match[1]
      const anchorInner = match[2].replace(/<[^>]+>/g, '').trim() // strip inner tags
      if (!videoUrl || seenUrls.has(videoUrl)) continue
      seenUrls.add(videoUrl)

      // Look around the match for channel and timestamp hints
      const contextStart = Math.max(0, match.index - 1500)
      const contextEnd = Math.min(html.length, match.index + (match[0]?.length || 0) + 1500)
      const context = html.slice(contextStart, contextEnd)

      // Channel link or handle nearby
      const channelMatch = context.match(/<a[^>]+href=\"([^\"]*youtube\.com\/(?:channel|@|c)\/[^\"]*)\"[^>]*>([\s\S]*?)<\/a>/i)
      const channelUrl = channelMatch ? channelMatch[1] : undefined
      const channelTitle = channelMatch ? channelMatch[2].replace(/<[^>]+>/g, '').trim() : undefined

      // Timestamp patterns similar to DOM path
      const timestampPatterns = [
        /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,
        /(\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,
        /(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} \w{2})/
      ]
      let timestamp: string | undefined
      for (const pattern of timestampPatterns) {
        const t = context.match(pattern)
        if (t) { timestamp = t[1]; break }
      }

      // Product detection
      const lowerContext = context.toLowerCase()
      const product: 'YouTube' | 'YouTube Music' = lowerContext.includes('youtube music') || lowerContext.includes('listened to')
        ? 'YouTube Music' : 'YouTube'

      const parsed: ParsedEntry = {
        isAd: false,
        videoUrl,
        videoTitle: anchorInner || undefined,
        channelUrl,
        channelTitle,
        timestamp,
        product
      }

      const normalized = this.normalizeRecord(parsed)
      if (normalized) records.push(normalized)
    }

    return records
  }

  private parseEntry(entry: Element): ParsedEntry | null {
    // If this element is already a content-cell, use it directly
    // Otherwise, prefer the first content cell within it, or fall back to the entry itself
    let mainContent: Element = entry
    if (!entry.classList.contains('content-cell')) {
      const contentCells = entry.querySelectorAll('.content-cell')
      mainContent = contentCells.length > 0 ? contentCells[0] : entry
    }
    
    const rawText = mainContent.textContent || ''
    const innerHTML = mainContent.innerHTML || ''
    
    // Normalize text by replacing non-breaking spaces and other special characters
    const text = rawText
      .replace(/\u202F|\u00A0/g, ' ')  // Replace narrow no-break space and no-break space with regular space
      .replace(/\s{2,}/g, ' ')         // Replace multiple spaces with single space
      .trim()
    
    // Skip ads
    if (text.includes('Viewed Ads On YouTube')) {
      return { isAd: true }
    }
    
    const parsed: ParsedEntry = {
      isAd: false
    }
    
    // Extract video link and title
    const videoLink = mainContent.querySelector('a[href*="youtube.com/watch"]')
    if (videoLink) {
      parsed.videoUrl = videoLink.getAttribute('href') || undefined
      parsed.videoTitle = videoLink.textContent?.trim() || undefined
      
      // If video title is just a URL, try to extract title from context
      if (parsed.videoTitle && parsed.videoTitle.startsWith('https://')) {
        // Look for title text that appears after the link but before <br> or channel info
        const linkHTML = videoLink.outerHTML
        const afterLink = innerHTML.split(linkHTML)[1]
        if (afterLink) {
          const titleMatch = afterLink.match(/^([^<\n]+?)(?:<br>|<a|$)/)
          if (titleMatch && titleMatch[1].trim() && !titleMatch[1].includes('youtube.com')) {
            parsed.videoTitle = titleMatch[1].trim()
          }
        }
      }
    }
    
    // Extract channel link and name - more comprehensive search
    const channelLink = mainContent.querySelector('a[href*="youtube.com/channel"], a[href*="youtube.com/@"], a[href*="youtube.com/c/"]')
    if (channelLink) {
      parsed.channelUrl = channelLink.getAttribute('href') || undefined
      parsed.channelTitle = channelLink.textContent?.trim() || undefined
    }
    
    // Enhanced timestamp extraction - handle multiple formats
    const timestampPatterns = [
      /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,  // Jun 23, 2025, 11:42:47 PM CDT
      /(\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,   // Jun 23, 2025 11:42:47 PM CDT (no comma)
      /(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} \w{2})/      // MM/DD/YYYY, HH:MM:SS AM/PM
    ]
    
    for (const pattern of timestampPatterns) {
      const match = text.match(pattern) || innerHTML.match(pattern)
      if (match) {
        parsed.timestamp = match[1]
        break
      }
    }
    
    // If no timestamp found with standard patterns, try more flexible matching
    if (!parsed.timestamp) {
      // Look for date and time parts separately and combine them
      const datePattern = /(\w{3} \d{1,2}, \d{4})/
      const timePattern = /(\d{1,2}:\d{2}:\d{2} \w{2} \w{3})/
      
      const dateMatch = text.match(datePattern) || innerHTML.match(datePattern)
      const timeMatch = text.match(timePattern) || innerHTML.match(timePattern)
      
      if (dateMatch && timeMatch) {
        parsed.timestamp = `${dateMatch[1]}, ${timeMatch[1]}`
      }
    }
    
    // Also check for "Watched at" prefix timestamps
    const watchedAtMatch = text.match(/Watched at (\d{1,2}:\d{2} \w{2})/)
    if (watchedAtMatch && !parsed.timestamp) {
      // Find the full date context - look for nearby date
      const dateMatch = text.match(/(\w{3} \d{1,2}, \d{4})/)
      if (dateMatch) {
        parsed.timestamp = `${dateMatch[1]}, ${watchedAtMatch[1]} CDT`
      }
    }
    
    // Determine product
    const productsSection = entry.querySelector('.content-cell .mdl-typography--caption') || entry.querySelector('.mdl-typography--caption')
    const productsText = productsSection?.textContent || ''
    
    if (productsText.includes('YouTube Music') || text.includes('Listened to')) {
      parsed.product = 'YouTube Music'
    } else {
      parsed.product = 'YouTube'
    }
    
    return parsed
  }

  private normalizeRecord(parsed: ParsedEntry): WatchRecord | null {
    if (!parsed.timestamp && !parsed.videoUrl) {
      return null // Skip entries without useful data
    }
    
    let watchedAt: string | null = null
    let year: number | null = null
    let month: number | null = null
    let week: number | null = null
    let dayOfWeek: number | null = null
    let hour: number | null = null
    let yoyKey: string | null = null
    
    if (parsed.timestamp) {
      try {
        // Helper function to sanitize timestamp strings
        const sanitizeTs = (s: string) =>
          s
            // Normalize non-breaking and narrow no-break spaces
            .replace(/\u202F|\u00A0/g, ' ')
            .replace(/\s{2,}/g, ' ')
            // Drop common timezone tokens that confuse Date parsing
            .replace(/\s(CDT|CST|PDT|PST|EDT|EST|UTC|GMT)\b/gi, '')
            // Normalize AM/PM casing
            .replace(/\s(AM|PM)\b/gi, (m) => m.toUpperCase())
            .trim()

        // Try multiple parsing strategies
        const tryParseDate = (raw: string): Date | null => {
          const candidate = sanitizeTs(raw)

          // Try native Date first
          const d1 = new Date(candidate)
          if (!isNaN(d1.getTime())) return d1

          // Try removing comma between date and time
          const variant = candidate.replace(', ', ' ').replace(/,/, ' ')
          const d2 = new Date(variant)
          if (!isNaN(d2.getTime())) return d2

          // Fallback: explicit MM/DD/YYYY, HH:MM:SS AM/PM pattern
          const m1 = candidate.match(/(\d{1,2}\/\d{1,2}\/\d{4}),?\s+(\d{1,2}:\d{2}:\d{2})\s+(AM|PM)/i)
          if (m1) {
            const [, md, hms, ampm] = m1
            const [M, D, Y] = md.split('/').map(Number)
            const [hh_raw, mm, ss] = hms.split(':').map(Number)
            let hh = hh_raw
            const up = ampm.toUpperCase()
            if (up === 'PM' && hh < 12) hh += 12
            if (up === 'AM' && hh === 12) hh = 0
            const d = new Date(Y, M - 1, D, hh, mm, ss)
            if (!isNaN(d.getTime())) return d
          }

          return null
        }

        const date = tryParseDate(parsed.timestamp)
        if (date) {
          watchedAt = date.toISOString()
          year = date.getFullYear()
          month = date.getMonth() + 1
          week = this.getWeekNumber(date)
          dayOfWeek = date.getDay()
          hour = date.getHours()
          yoyKey = `${year}-${String(month).padStart(2, '0')}`
        } else {
          console.warn('Could not parse timestamp after all attempts:', parsed.timestamp)
        }
      } catch (error) {
        console.warn('Failed to parse timestamp:', parsed.timestamp, error)
      }
    }
    
    const id = this.generateId(parsed.videoUrl || '', parsed.timestamp || '', parsed.videoTitle || '')
    const topics = this.extractTopics(parsed.videoTitle, parsed.channelTitle)
    
    return {
      id,
      watchedAt,
      videoId: this.extractVideoId(parsed.videoUrl) || null,
      videoTitle: parsed.videoTitle || null,
      videoUrl: parsed.videoUrl || null,
      channelTitle: parsed.channelTitle || null,
      channelUrl: parsed.channelUrl || null,
      product: (parsed.product as 'YouTube' | 'YouTube Music') || 'YouTube',
      topics,
      year,
      month,
      week,
      dayOfWeek,
      hour,
      yoyKey,
      rawTimestamp: parsed.timestamp
    }
  }

  private generateId(videoUrl: string, timestamp: string, title: string): string {
    const hashInput = `${videoUrl}|${timestamp}|${title}`
    
    // Use a simple hash function instead of btoa to handle Unicode characters
    let hash = 0
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Convert to base36 for a compact alphanumeric string
    const hashStr = Math.abs(hash).toString(36)
    
    // Add timestamp component for uniqueness
    const timeComponent = Date.now().toString(36).slice(-4)
    
    // Combine and ensure consistent length
    return (hashStr + timeComponent).padEnd(16, '0').substring(0, 16)
  }

  private extractVideoId(url?: string): string | null {
    if (!url) return null
    const match = url.match(/[?&]v=([^&]+)/)
    return match ? match[1] : null
  }

  private extractTopics(videoTitle?: string, channelTitle?: string): string[] {
    const topics = new Set<string>()
    const text = `${videoTitle || ''} ${channelTitle || ''}`.toLowerCase()
    
    Object.entries(this.topicKeywords).forEach(([topic, keywords]) => {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.add(topic)
      }
    })
    
    return Array.from(topics)
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }

  generateSummary(records: WatchRecord[]): ImportSummary {
    const uniqueChannels = new Set(records.map(r => r.channelTitle).filter(Boolean))
    
    const validDates = records
      .map(r => r.watchedAt ? new Date(r.watchedAt) : null)
      .filter((d): d is Date => d !== null && !isNaN(d.getTime()))
    
    const dateRange = {
      start: validDates.length > 0 ? new Date(Math.min(...validDates.map(d => d.getTime()))) : null,
      end: validDates.length > 0 ? new Date(Math.max(...validDates.map(d => d.getTime()))) : null
    }
    
    const productBreakdown = records.reduce((acc, record) => {
      if (record.product === 'YouTube Music') {
        acc.youtubeMusic++
      } else {
        acc.youtube++
      }
      return acc
    }, { youtube: 0, youtubeMusic: 0 })
    
    return {
      totalRecords: records.length,
      uniqueChannels: uniqueChannels.size,
      dateRange,
      productBreakdown,
      parseErrors: 0 // TODO: Track parse errors
    }
  }
}