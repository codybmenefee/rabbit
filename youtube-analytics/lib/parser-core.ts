import { WatchRecord, ParsedEntry, ImportSummary } from '@/types/records'
import { extractTimestamp, getTimestampExtractionStats, TimestampExtractionResult } from './resilient-timestamp-extractor'

export interface ParseProgressCallback {
  (processed: number, total: number, percentage: number, eta: number, currentChunk: number, totalChunks: number): void
}

export interface ParsingOptions {
  chunkSize?: number
  onProgress?: ParseProgressCallback
  shouldCancel?: () => boolean
  enableTimestampValidation?: boolean
  logTimestampFailures?: boolean
  minTimestampConfidence?: number
}

export interface TimestampParsingStats {
  totalRecords: number
  recordsWithTimestamps: number
  recordsWithoutTimestamps: number
  timestampExtractionFailures: number
  lowConfidenceExtractions: number
  averageConfidence: number
  strategyUsage: Record<string, number>
  qualityMetrics: {
    withTimezones: number
    withFullDateTime: number
    formatRecognized: number
    dateReasonable: number
  }
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

  // Removed pattern caching to prevent cross-contamination between records
  // Each record is now parsed independently using the resilient timestamp extractor

  // Performance monitoring
  private memoryThreshold = 100 * 1024 * 1024 // 100MB threshold for memory warnings
  private processedRecords = 0
  private startTime = 0
  
  // Timestamp processing stats
  private timestampStats: TimestampParsingStats = {
    totalRecords: 0,
    recordsWithTimestamps: 0,
    recordsWithoutTimestamps: 0,
    timestampExtractionFailures: 0,
    lowConfidenceExtractions: 0,
    averageConfidence: 0,
    strategyUsage: {},
    qualityMetrics: {
      withTimezones: 0,
      withFullDateTime: 0,
      formatRecognized: 0,
      dateReasonable: 0
    }
  }
  
  // Enable detailed logging
  private enableTimestampValidation: boolean = true
  private logTimestampFailures: boolean = true
  private minTimestampConfidence: number = 70

  async parseHTML(htmlContent: string, options: ParsingOptions = {}): Promise<WatchRecord[]> {
    // Initialize parsing options
    this.enableTimestampValidation = options.enableTimestampValidation !== false
    this.logTimestampFailures = options.logTimestampFailures !== false
    this.minTimestampConfidence = options.minTimestampConfidence || 70
    
    // Reset timestamp stats
    this.resetTimestampStats()
    
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

    // Log final timestamp processing stats
    this.logTimestampProcessingResults()
    
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
    
    // Use resilient timestamp extractor with comprehensive validation
    const timestampResult = extractTimestamp(text, innerHTML, { 
      debug: this.logTimestampFailures,
      minConfidence: this.minTimestampConfidence,
      enableMetrics: this.enableTimestampValidation
    })
    
    // Log timestamp extraction details for debugging
    if (this.logTimestampFailures) {
      this.logTimestampExtractionAttempt(timestampResult, text, innerHTML)
    }
    
    if (timestampResult.rawTimestamp) {
      parsed.timestamp = timestampResult.rawTimestamp
      parsed.timestampExtractionResult = timestampResult // Store full result for analysis
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
    // Update timestamp stats
    this.timestampStats.totalRecords++
    
    if (!parsed.timestamp && !parsed.videoUrl) {
      this.timestampStats.recordsWithoutTimestamps++
      return null
    }
    
    let watchedAt: string | null = null
    let year: number | null = null
    let month: number | null = null
    let week: number | null = null
    let dayOfWeek: number | null = null
    let hour: number | null = null
    let yoyKey: string | null = null
    let rawTimestamp: string | null = null
    
    if (parsed.timestamp) {
      try {
        // Use extraction result from parseEntry if available, otherwise re-extract
        const extractionResult = (parsed as any).timestampExtractionResult || 
                                extractTimestamp(parsed.timestamp, '', {
                                  debug: this.logTimestampFailures,
                                  minConfidence: this.minTimestampConfidence,
                                  enableMetrics: this.enableTimestampValidation
                                })
        
        if (extractionResult.timestamp) {
          // Successfully extracted and validated timestamp
          this.timestampStats.recordsWithTimestamps++
          
          // Update quality metrics
          this.updateTimestampQualityStats(extractionResult)
          
          // Track strategy usage
          if (extractionResult.strategy) {
            this.timestampStats.strategyUsage[extractionResult.strategy] = 
              (this.timestampStats.strategyUsage[extractionResult.strategy] || 0) + 1
          }
          
          // Check confidence level
          if (extractionResult.confidence < this.minTimestampConfidence) {
            this.timestampStats.lowConfidenceExtractions++
            if (this.logTimestampFailures) {
              console.warn(`Low confidence timestamp (${extractionResult.confidence}%):`, parsed.timestamp)
            }
          }
          
          const date = new Date(extractionResult.timestamp)
          watchedAt = extractionResult.timestamp
          year = date.getFullYear()
          month = date.getMonth() + 1
          week = this.getWeekNumber(date)
          dayOfWeek = date.getDay()
          hour = date.getHours()
          yoyKey = `${year}-${String(month).padStart(2, '0')}`
          rawTimestamp = extractionResult.rawTimestamp
        } else {
          // Extraction failed - preserve raw timestamp for debugging
          this.timestampStats.timestampExtractionFailures++
          this.timestampStats.recordsWithoutTimestamps++
          rawTimestamp = parsed.timestamp
          
          if (this.logTimestampFailures) {
            console.warn('Resilient timestamp extraction failed for:', parsed.timestamp, {
              confidence: extractionResult.confidence,
              attempts: extractionResult.debugInfo?.attempts?.length || 0,
              metrics: extractionResult.metrics
            })
          }
        }
      } catch (error) {
        this.timestampStats.timestampExtractionFailures++
        this.timestampStats.recordsWithoutTimestamps++
        rawTimestamp = parsed.timestamp
        
        if (this.logTimestampFailures) {
          console.error('Failed to extract timestamp:', parsed.timestamp, error)
        }
      }
    } else {
      this.timestampStats.recordsWithoutTimestamps++
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
      rawTimestamp: rawTimestamp || parsed.timestamp
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
  
  /**
   * Reset timestamp processing statistics
   */
  private resetTimestampStats() {
    this.timestampStats = {
      totalRecords: 0,
      recordsWithTimestamps: 0,
      recordsWithoutTimestamps: 0,
      timestampExtractionFailures: 0,
      lowConfidenceExtractions: 0,
      averageConfidence: 0,
      strategyUsage: {},
      qualityMetrics: {
        withTimezones: 0,
        withFullDateTime: 0,
        formatRecognized: 0,
        dateReasonable: 0
      }
    }
  }
  
  /**
   * Update timestamp quality statistics
   */
  private updateTimestampQualityStats(result: TimestampExtractionResult) {
    if (result.quality.hasTimezone) this.timestampStats.qualityMetrics.withTimezones++
    if (result.quality.hasFullDateTime) this.timestampStats.qualityMetrics.withFullDateTime++
    if (result.quality.formatRecognized) this.timestampStats.qualityMetrics.formatRecognized++
    if (result.quality.dateReasonable) this.timestampStats.qualityMetrics.dateReasonable++
  }
  
  /**
   * Log timestamp extraction attempt for debugging
   */
  private logTimestampExtractionAttempt(result: TimestampExtractionResult, textContent: string, innerHTML: string) {
    if (result.debugInfo && result.debugInfo.attempts.length > 0) {
      const failedAttempts = result.debugInfo.attempts.filter(a => a.result === 'failed')
      
      if (failedAttempts.length > 0 || result.confidence < this.minTimestampConfidence) {
        console.log('🕒 Timestamp Extraction Debug:', {
          textSnippet: textContent.substring(0, 100) + '...',
          finalResult: {
            success: !!result.timestamp,
            confidence: result.confidence,
            strategy: result.strategy,
            rawTimestamp: result.rawTimestamp
          },
          attempts: result.debugInfo.attempts.map(a => ({
            strategy: a.strategy,
            result: a.result,
            confidence: a.confidence,
            timeMs: a.timeMs,
            error: a.error
          })),
          quality: result.quality,
          metrics: result.metrics
        })
      }
    }
  }
  
  /**
   * Log final timestamp processing results
   */
  private logTimestampProcessingResults() {
    if (this.logTimestampFailures && this.timestampStats.totalRecords > 0) {
      const successRate = (this.timestampStats.recordsWithTimestamps / this.timestampStats.totalRecords) * 100
      
      console.log('📊 Timestamp Processing Summary:', {
        totalRecords: this.timestampStats.totalRecords,
        withTimestamps: this.timestampStats.recordsWithTimestamps,
        withoutTimestamps: this.timestampStats.recordsWithoutTimestamps,
        extractionFailures: this.timestampStats.timestampExtractionFailures,
        lowConfidenceExtractions: this.timestampStats.lowConfidenceExtractions,
        successRate: `${successRate.toFixed(1)}%`,
        strategyUsage: this.timestampStats.strategyUsage,
        qualityMetrics: {
          withTimezones: `${this.timestampStats.qualityMetrics.withTimezones}/${this.timestampStats.recordsWithTimestamps}`,
          withFullDateTime: `${this.timestampStats.qualityMetrics.withFullDateTime}/${this.timestampStats.recordsWithTimestamps}`,
          formatRecognized: `${this.timestampStats.qualityMetrics.formatRecognized}/${this.timestampStats.recordsWithTimestamps}`,
          dateReasonable: `${this.timestampStats.qualityMetrics.dateReasonable}/${this.timestampStats.recordsWithTimestamps}`
        }
      })
      
      // Also log global extraction stats
      const globalStats = getTimestampExtractionStats()
      console.log('🌍 Global Timestamp Extraction Stats:', globalStats)
    }
  }
  
  /**
   * Get current timestamp processing statistics
   */
  getTimestampStats(): TimestampParsingStats {
    // Calculate average confidence from recorded records
    const totalConfidence = this.timestampStats.recordsWithTimestamps > 0 ? 
      (this.timestampStats.recordsWithTimestamps - this.timestampStats.lowConfidenceExtractions) * 85 + 
      this.timestampStats.lowConfidenceExtractions * 50 : 0
    
    this.timestampStats.averageConfidence = this.timestampStats.recordsWithTimestamps > 0 ? 
      totalConfidence / this.timestampStats.recordsWithTimestamps : 0
      
    return { ...this.timestampStats }
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
      parseErrors: 0,
      timestampStats: this.getTimestampStats()
    }
  }
}

/**
 * Processing strategy interface for Phase 2 server migration
 */
export interface ProcessingStrategy {
  parseHTML(content: string, options?: ParsingOptions): Promise<WatchRecord[]>
  generateSummary(records: WatchRecord[]): ImportSummary
  getTimestampStats(): TimestampParsingStats
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
  
  getTimestampStats(): TimestampParsingStats {
    return this.parser.getTimestampStats()
  }
}