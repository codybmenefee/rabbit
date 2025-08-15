import { WatchRecord, ParsedEntry, ImportSummary } from '@/types/records'

export interface ParseProgressCallback {
  (processed: number, total: number, percentage: number, eta: number, currentChunk: number, totalChunks: number): void
}

export interface ParsingOptions {
  chunkSize?: number
  onProgress?: ParseProgressCallback
  shouldCancel?: () => boolean
}

/**
 * Core YouTube History Parser
 * Shared implementation used by both main thread and Web Worker
 */
export class YouTubeHistoryParserCore {
  // Optimized topic keywords using Sets for O(1) lookup
  private topicKeywords: Record<string, Set<string>> = {
    tech: new Set(['ai', 'programming', 'coding', 'software', 'developer', 'tech', 'computer', 'startup']),
    business: new Set(['business', 'finance', 'economy', 'market', 'startup', 'entrepreneur', 'investing']),
    entertainment: new Set(['music', 'movie', 'game', 'gaming', 'comedy', 'entertainment', 'funny']),
    education: new Set(['tutorial', 'learn', 'course', 'education', 'explained', 'how to', 'guide']),
    news: new Set(['news', 'politics', 'current', 'breaking', 'update', 'report']),
    health: new Set(['fitness', 'health', 'workout', 'nutrition', 'medical', 'wellness']),
    science: new Set(['science', 'physics', 'chemistry', 'biology', 'research', 'study']),
    lifestyle: new Set(['lifestyle', 'vlog', 'daily', 'routine', 'travel', 'food', 'cooking'])
  }

  // Cache for successful timestamp patterns to avoid repeated regex matching
  private timestampPatternCache = new Map<string, RegExp>()
  private successfulPattern: RegExp | null = null

  // Performance monitoring
  private memoryThreshold = 100 * 1024 * 1024 // 100MB threshold for memory warnings
  private processedRecords = 0
  private startTime = 0

  async parseHTML(htmlContent: string, options: ParsingOptions = {}): Promise<WatchRecord[]> {
    // Adaptive chunk sizing based on content density
    const CHUNK_SIZE = options.chunkSize || this.calculateOptimalChunkSize(htmlContent)
    const chunks = this.createChunks(htmlContent, CHUNK_SIZE)
    const records: WatchRecord[] = []
    this.startTime = Date.now()
    this.processedRecords = 0
    
    // Pre-allocate array to avoid repeated resizing
    const estimatedRecordsPerChunk = 500 // rough estimate
    records.length = 0 // ensure it starts empty but has capacity

    for (let i = 0; i < chunks.length; i++) {
      // Check for cancellation
      if (options.shouldCancel?.()) {
        break
      }

      const chunkStartTime = performance.now()
      const chunkRecords = this.parseChunk(chunks[i], i === 0)
      
      // Use efficient array concatenation
      for (const record of chunkRecords) {
        records.push(record)
      }
      
      this.processedRecords += chunkRecords.length
      const chunkProcessTime = performance.now() - chunkStartTime

      // Memory monitoring and optional garbage collection hint
      if (typeof (globalThis as any).gc === 'function' && i % 5 === 0) {
        (globalThis as any).gc()
      }

      // Progress reporting
      const processed = i + 1
      const shouldReportProgress = options.onProgress && (i === chunks.length - 1 || chunkProcessTime > 16.67) // 60fps threshold
      
      if (shouldReportProgress) {
        const percentage = (processed / chunks.length) * 100
        const elapsed = (Date.now() - this.startTime) / 1000
        const eta = chunks.length > processed ? (elapsed / processed) * (chunks.length - processed) : 0

        options.onProgress!(this.processedRecords, 0, percentage, eta, processed, chunks.length)
      }

      // Adaptive yielding based on processing time
      if (chunkProcessTime > 16.67) { // If chunk took longer than 1 frame (60fps)
        await new Promise(resolve => setTimeout(resolve, 0))
      }
    }

    // If no records found from chunked parsing, try regex fallback
    if (records.length === 0) {
      const fallbackRecords = this.parseWithRegexFallback(htmlContent)
      records.push(...fallbackRecords)
    }

    return records
  }

  private calculateOptimalChunkSize(content: string): number {
    const contentLength = content.length
    const baseSizeKB = 1024 // 1MB base
    
    // Estimate content density by counting HTML tags
    const tagCount = (content.match(/<[^>]+>/g) || []).length
    const density = tagCount / (contentLength / 1000) // tags per KB
    
    // Adjust chunk size based on density
    // Higher density = smaller chunks for more responsive progress
    let chunkSize = baseSizeKB * 1024
    if (density > 50) { // Very dense HTML
      chunkSize = Math.max(512 * 1024, chunkSize * 0.5) // Min 512KB
    } else if (density < 10) { // Sparse HTML
      chunkSize = Math.min(2048 * 1024, chunkSize * 1.5) // Max 2MB
    }
    
    return chunkSize
  }

  private createChunks(content: string, chunkSize: number): string[] {
    const chunks: string[] = []
    const contentLength = content.length
    
    if (contentLength <= chunkSize) {
      return [content]
    }

    for (let i = 0; i < contentLength; i += chunkSize) {
      let end = Math.min(i + chunkSize, contentLength)
      
      // Optimized boundary detection - look for content-cell boundaries first
      if (end < contentLength) {
        const contentCellBoundary = content.indexOf('content-cell', end)
        const nextCloseTag = content.indexOf('>', end)
        
        // Prefer content-cell boundaries for cleaner parsing
        if (contentCellBoundary !== -1 && contentCellBoundary - end < 2000) {
          end = contentCellBoundary
        } else if (nextCloseTag !== -1 && nextCloseTag - end < 1000) {
          end = nextCloseTag + 1
        }
      }
      
      chunks.push(content.slice(i, end))
    }

    return chunks
  }

  private parseChunk(chunk: string, isFirstChunk: boolean): WatchRecord[] {
    // Use DOMParser if available (main thread), otherwise fall back to regex parsing
    let doc: Document | null = null
    
    if (typeof DOMParser !== 'undefined') {
      const parser = new DOMParser()
      doc = parser.parseFromString(chunk, 'text/html')
    }
    const records: WatchRecord[] = []

    // If DOMParser is not available (worker context), use regex fallback
    if (!doc) {
      const fallbackRecords = this.parseWithRegexFallback(chunk)
      records.push(...fallbackRecords)
      return records
    }

    // Primary: Google Takeout classic structure
    const contentCells: Element[] = Array.from(
      doc.querySelectorAll('.content-cell')
    )

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
      // Fallback: Look for outer containers
      let entryNodes: Element[] = Array.from(
        doc.querySelectorAll('.outer-cell.mdl-cell.mdl-cell--12-col.mdl-shadow--2dp')
      )

      // More generic scan when classes differ
      if (entryNodes.length === 0) {
        const watchLinks = Array.from(
          doc.querySelectorAll('a[href*="youtube.com/watch"]')
        ) as Element[]

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

    return records
  }

  private parseWithRegexFallback(html: string): WatchRecord[] {
    const records: WatchRecord[] = []
    const watchLinkRegex = /<a[^>]+href=\"([^\"]*youtube\.com\/(?:watch\?[^\"]*v=[^\"&]+|shorts\/[^\"?&]+)[^\"]*)\"[^>]*>([\s\S]*?)<\/a>/gi
    let match: RegExpExecArray | null
    const seenUrls = new Set<string>()

    while ((match = watchLinkRegex.exec(html)) !== null) {
      const videoUrl = match[1]
      const anchorInner = match[2].replace(/<[^>]+>/g, '').trim()
      if (!videoUrl || seenUrls.has(videoUrl)) continue
      seenUrls.add(videoUrl)

      const contextStart = Math.max(0, match.index - 1500)
      const contextEnd = Math.min(html.length, match.index + (match[0]?.length || 0) + 1500)
      const context = html.slice(contextStart, contextEnd)

      const channelMatch = context.match(/<a[^>]+href=\"([^\"]*youtube\.com\/(?:channel|@|c)\/[^\"]*)\"[^>]*>([\s\S]*?)<\/a>/i)
      const channelUrl = channelMatch ? channelMatch[1] : undefined
      const channelTitle = channelMatch ? channelMatch[2].replace(/<[^>]+>/g, '').trim() : undefined

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
    let mainContent: Element = entry
    if (!entry.classList.contains('content-cell')) {
      const contentCells = entry.querySelectorAll('.content-cell')
      mainContent = contentCells.length > 0 ? contentCells[0] : entry
    }
    
    const rawText = mainContent.textContent || ''
    const innerHTML = mainContent.innerHTML || ''
    
    const text = rawText
      .replace(/\u202F|\u00A0/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    
    if (text.includes('Viewed Ads On YouTube')) {
      return { isAd: true }
    }
    
    const parsed: ParsedEntry = { isAd: false }
    
    // Extract video link and title
    const videoLink = mainContent.querySelector('a[href*="youtube.com/watch"]')
    if (videoLink) {
      parsed.videoUrl = videoLink.getAttribute('href') || undefined
      parsed.videoTitle = videoLink.textContent?.trim() || undefined
      
      if (parsed.videoTitle && parsed.videoTitle.startsWith('https://')) {
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
    
    // Extract channel link and name
    const channelLink = mainContent.querySelector('a[href*="youtube.com/channel"], a[href*="youtube.com/@"], a[href*="youtube.com/c/"]')
    if (channelLink) {
      parsed.channelUrl = channelLink.getAttribute('href') || undefined
      parsed.channelTitle = channelLink.textContent?.trim() || undefined
    }
    
    // Optimized timestamp extraction with pattern caching
    if (this.successfulPattern) {
      // Try the last successful pattern first
      const match = text.match(this.successfulPattern) || innerHTML.match(this.successfulPattern)
      if (match) {
        parsed.timestamp = match[1]
      }
    }
    
    if (!parsed.timestamp) {
      const timestampPatterns = [
        /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,
        /(\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,
        /(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} \w{2})/
      ]
      
      for (const pattern of timestampPatterns) {
        const match = text.match(pattern) || innerHTML.match(pattern)
        if (match) {
          parsed.timestamp = match[1]
          this.successfulPattern = pattern // Cache for next time
          break
        }
      }
    }
    
    if (!parsed.timestamp) {
      const datePattern = /(\w{3} \d{1,2}, \d{4})/
      const timePattern = /(\d{1,2}:\d{2}:\d{2} \w{2} \w{3})/
      
      const dateMatch = text.match(datePattern) || innerHTML.match(datePattern)
      const timeMatch = text.match(timePattern) || innerHTML.match(timePattern)
      
      if (dateMatch && timeMatch) {
        parsed.timestamp = `${dateMatch[1]}, ${timeMatch[1]}`
      }
    }
    
    const watchedAtMatch = text.match(/Watched at (\d{1,2}:\d{2} \w{2})/)
    if (watchedAtMatch && !parsed.timestamp) {
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
      return null
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
        const sanitizeTs = (s: string) =>
          s
            .replace(/\u202F|\u00A0/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .replace(/\s(CDT|CST|PDT|PST|EDT|EST|UTC|GMT)\b/gi, '')
            .replace(/\s(AM|PM)\b/gi, (m) => m.toUpperCase())
            .trim()

        const tryParseDate = (raw: string): Date | null => {
          const candidate = sanitizeTs(raw)

          const d1 = new Date(candidate)
          if (!isNaN(d1.getTime())) return d1

          const variant = candidate.replace(', ', ' ').replace(/,/, ' ')
          const d2 = new Date(variant)
          if (!isNaN(d2.getTime())) return d2

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
    
    let hash = 0
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    
    const hashStr = Math.abs(hash).toString(36)
    const timeComponent = Date.now().toString(36).slice(-4)
    
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
    
    // Split text into words once for efficient Set lookup
    const words = new Set(text.split(/\s+/))
    
    // Optimized topic matching using Set intersection
    Object.entries(this.topicKeywords).forEach(([topic, keywordSet]) => {
      // Convert Set to Array for compatibility
      const wordsArray = Array.from(words)
      for (const word of wordsArray) {
        if (keywordSet.has(word)) {
          topics.add(topic)
          break // Found match, no need to check more keywords for this topic
        }
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
      parseErrors: 0
    }
  }
}

/**
 * Processing strategy interface for Phase 2 server migration
 */
export interface ProcessingStrategy {
  parseHTML(content: string, options?: ParsingOptions): Promise<WatchRecord[]>
  generateSummary(records: WatchRecord[]): ImportSummary
}

/**
 * Client-side processing strategy using shared core
 */
export class ClientProcessingStrategy implements ProcessingStrategy {
  private parser = new YouTubeHistoryParserCore()

  async parseHTML(content: string, options?: ParsingOptions): Promise<WatchRecord[]> {
    return this.parser.parseHTML(content, options)
  }

  generateSummary(records: WatchRecord[]): ImportSummary {
    return this.parser.generateSummary(records)
  }
}