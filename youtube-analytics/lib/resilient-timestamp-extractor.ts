import { parse, isValid as isValidDate } from 'date-fns'

/**
 * Resilient Timestamp Extractor
 * 
 * Core module for extracting and parsing timestamps from Google Takeout HTML.
 * Designed to handle international formats, various locale settings, and edge cases
 * while providing comprehensive validation and zero cross-contamination between records.
 * 
 * Key Features:
 * - Multiple parsing strategies with fallbacks
 * - Comprehensive validation pipeline
 * - International format support
 * - Stateless operation (no caching between calls)
 * - Detailed logging for debugging
 */

export interface TimestampExtractionResult {
  /** Parsed ISO timestamp or null if extraction failed */
  timestamp: string | null
  /** Raw timestamp string found in HTML */
  rawTimestamp: string | null
  /** Parsing strategy that succeeded */
  strategy: string | null
  /** Confidence score (0-100) for the extraction */
  confidence: number
  /** Quality indicators */
  quality: {
    hasTimezone: boolean
    hasFullDateTime: boolean
    formatRecognized: boolean
    dateReasonable: boolean
  }
  /** Validation metrics */
  metrics: {
    extractionTimeMs: number
    attemptsCount: number
    patternMatchCount: number
    fallbackUsed: boolean
  }
  /** Debug information about parsing attempts */
  debugInfo?: {
    attempts: Array<{
      strategy: string
      rawInput: string
      result: 'success' | 'failed'
      confidence?: number
      timeMs: number
      error?: string
    }>
    totalTimeMs: number
    bestAttempt?: {
      strategy: string
      confidence: number
      timestamp: string
    }
  }
}

export interface TimestampExtractionOptions {
  /** Enable debug logging */
  debug?: boolean
  /** Custom timezone for parsing (defaults to handling common US timezones) */
  defaultTimezone?: string
  /** Minimum confidence threshold (0-100) */
  minConfidence?: number
  /** Enable comprehensive validation metrics */
  enableMetrics?: boolean
  /** Enable international format detection */
  enableInternational?: boolean
}

/**
 * Resilient Timestamp Extractor Class
 * Handles timestamp extraction from HTML content with multiple parsing strategies
 */
export class ResilientTimestampExtractor {
  private debug: boolean = false
  private minConfidence: number = 70
  private enableMetrics: boolean = true
  private enableInternational: boolean = true
  private defaultTimezone: string
  
  // Success rate tracking
  private static extractionStats = {
    totalAttempts: 0,
    successfulExtractions: 0,
    failedExtractions: 0,
    averageConfidence: 0,
    strategySuccessRates: new Map<string, { attempts: number; successes: number }>()
  }

  constructor(options: TimestampExtractionOptions = {}) {
    this.debug = options.debug || false
    this.minConfidence = options.minConfidence || 70
    this.enableMetrics = options.enableMetrics !== false
    this.enableInternational = options.enableInternational !== false
    this.defaultTimezone = options.defaultTimezone || 'America/Chicago' // CDT/CST default
  }

  /**
   * Extract and parse timestamp from HTML text content
   * @param textContent - Text content from HTML element
   * @param innerHTML - Inner HTML content for fallback regex matching
   * @returns TimestampExtractionResult with parsed timestamp or null
   */
  extractTimestamp(textContent: string, innerHTML: string): TimestampExtractionResult {
    const startTime = performance.now()
    ResilientTimestampExtractor.extractionStats.totalAttempts++
    
    const result: TimestampExtractionResult = {
      timestamp: null,
      rawTimestamp: null,
      strategy: null,
      confidence: 0,
      quality: {
        hasTimezone: false,
        hasFullDateTime: false,
        formatRecognized: false,
        dateReasonable: false
      },
      metrics: {
        extractionTimeMs: 0,
        attemptsCount: 0,
        patternMatchCount: 0,
        fallbackUsed: false
      },
      debugInfo: this.debug ? { 
        attempts: [], 
        totalTimeMs: 0,
        bestAttempt: undefined 
      } : undefined
    }

    // Pre-process text content - sanitize common issues
    const sanitizedText = this.sanitizeTextContent(textContent)
    const sanitizedHTML = this.sanitizeTextContent(innerHTML)

    // Strategy 1: Enhanced Regex Extraction
    const regexStartTime = performance.now()
    result.metrics.attemptsCount++
    const regexResult = this.extractWithEnhancedRegex(sanitizedText, sanitizedHTML)
    
    if (regexResult.success) {
      result.metrics.patternMatchCount++
      const parsed = this.parseWithMultipleStrategies(regexResult.rawTimestamp!)
      
      if (parsed.success) {
        // Validate the parsed date is reasonable
        const parsedDate = new Date(parsed.timestamp!)
        const isReasonable = this.isReasonableDate(parsedDate)
        
        const confidence = this.calculateConfidence(regexResult.rawTimestamp!, parsed.strategy!, false)
        
        if (confidence >= this.minConfidence && isReasonable) {
          result.timestamp = parsed.timestamp
          result.rawTimestamp = regexResult.rawTimestamp
          result.strategy = `regex-${parsed.strategy}`
          result.confidence = confidence
          result.quality = this.analyzeQuality(regexResult.rawTimestamp!, parsed.timestamp!)
          this.debugLog(result, 'regex', regexResult.rawTimestamp!, 'success', undefined, confidence, performance.now() - regexStartTime)
          
          // Update success stats
          this.updateStrategyStats(`regex-${parsed.strategy}`, true)
          ResilientTimestampExtractor.extractionStats.successfulExtractions++
          
          result.metrics.extractionTimeMs = performance.now() - startTime
          if (result.debugInfo) result.debugInfo.totalTimeMs = result.metrics.extractionTimeMs
          
          return result
        }
      }
      this.debugLog(result, 'regex', regexResult.rawTimestamp!, 'failed', parsed.error, 0, performance.now() - regexStartTime)
      this.updateStrategyStats('regex', false)
    } else {
      this.debugLog(result, 'regex', sanitizedText, 'failed', 'No timestamp pattern found', 0, performance.now() - regexStartTime)
      this.updateStrategyStats('regex', false)
    }

    // Strategy 2: Fallback - look for any date-like patterns
    const fallbackStartTime = performance.now()
    result.metrics.attemptsCount++
    result.metrics.fallbackUsed = true
    const fallbackResult = this.extractWithFallbackPatterns(sanitizedText, sanitizedHTML)
    
    if (fallbackResult.success) {
      result.metrics.patternMatchCount++
      const parsed = this.parseWithMultipleStrategies(fallbackResult.rawTimestamp!)
      
      if (parsed.success) {
        // Validate the parsed date is reasonable
        const parsedDate = new Date(parsed.timestamp!)
        const isReasonable = this.isReasonableDate(parsedDate)
        
        const confidence = this.calculateConfidence(fallbackResult.rawTimestamp!, parsed.strategy!, true)
        
        if (confidence >= this.minConfidence && isReasonable) {
          result.timestamp = parsed.timestamp
          result.rawTimestamp = fallbackResult.rawTimestamp
          result.strategy = `fallback-${parsed.strategy}`
          result.confidence = confidence
          result.quality = this.analyzeQuality(fallbackResult.rawTimestamp!, parsed.timestamp!)
          this.debugLog(result, 'fallback', fallbackResult.rawTimestamp!, 'success', undefined, confidence, performance.now() - fallbackStartTime)
          
          // Update success stats
          this.updateStrategyStats(`fallback-${parsed.strategy}`, true)
          ResilientTimestampExtractor.extractionStats.successfulExtractions++
          
          result.metrics.extractionTimeMs = performance.now() - startTime
          if (result.debugInfo) result.debugInfo.totalTimeMs = result.metrics.extractionTimeMs
          
          return result
        }
      }
      this.debugLog(result, 'fallback', fallbackResult.rawTimestamp!, 'failed', parsed.error, 0, performance.now() - fallbackStartTime)
      this.updateStrategyStats('fallback', false)
    } else {
      this.debugLog(result, 'fallback', sanitizedText, 'failed', 'No fallback pattern found', 0, performance.now() - fallbackStartTime)
      this.updateStrategyStats('fallback', false)
    }

    // No valid timestamp found
    ResilientTimestampExtractor.extractionStats.failedExtractions++
    result.metrics.extractionTimeMs = performance.now() - startTime
    if (result.debugInfo) {
      result.debugInfo.totalTimeMs = result.metrics.extractionTimeMs
    }
    
    return result
  }

  /**
   * Sanitize text content for consistent parsing
   */
  private sanitizeTextContent(text: string): string {
    return text
      .replace(/[\u202F\u00A0\u2009\u200A\u2028\u2029]/g, ' ') // Replace all types of non-breaking spaces and separators
      .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
      .replace(/[\n\r\t]/g, ' ') // Replace line breaks and tabs
      .replace(/[^\x00-\x7F]/g, (match) => {
        // Keep common punctuation but normalize problematic unicode
        if (/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ]/i.test(match)) return match
        if (/[•·]/i.test(match)) return '•'
        return ' '
      })
      .trim()
  }

  /**
   * Enhanced regex extraction with comprehensive Google Takeout patterns
   */
  private extractWithEnhancedRegex(text: string, html: string): { success: boolean; rawTimestamp?: string } {
    // Comprehensive timestamp patterns for Google Takeout
    const patterns = [
      // US Formats with timezone abbreviations (highest priority)
      /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,  // Aug 11, 2025, 10:30:00 PM CDT
      /(\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,   // Aug 11, 2025 10:30:00 PM CDT
      /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2})/,        // Aug 11, 2025, 10:30:00 PM
      /(\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} \w{2})/,         // Aug 11, 2025 10:30:00 PM
      
      // Alternative US formats
      /(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} \w{2})/,    // 8/11/2025, 10:30:00 PM
      /(\d{1,2}\/\d{1,2}\/\d{4} \d{1,2}:\d{2}:\d{2} \w{2})/,     // 8/11/2025 10:30:00 PM
      
      // ISO-like formats
      /(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/,                    // 2025-08-11 22:30:00
      /(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/,                  // 2025/08/11 22:30:00
      
      // European formats (dd/mm/yyyy or dd.mm.yyyy)
      /(\d{1,2}\.\d{1,2}\.\d{4}, \d{1,2}:\d{2}:\d{2})/,          // 11.08.2025, 22:30:00
      /(\d{1,2}\.\d{1,2}\.\d{4} \d{1,2}:\d{2}:\d{2})/,           // 11.08.2025 22:30:00
      
      // Alternative separators and formats
      /(\w{3} \d{1,2}, \d{4} at \d{1,2}:\d{2} \w{2})/,           // Aug 11, 2025 at 10:30 PM
      /(\w{3} \d{1,2}, \d{4} • \d{1,2}:\d{2} \w{2})/,            // Aug 11, 2025 • 10:30 PM
      
      // Watched at patterns (specific to YouTube exports)
      /(Watched at \d{1,2}:\d{2} \w{2}.*?(\w{3} \d{1,2}, \d{4}))/,
      
      // International month names (common in non-English exports)
      /(\d{1,2} \w{3,} \d{4}, \d{1,2}:\d{2}:\d{2})/,             // 11 August 2025, 22:30:00
      /(\d{1,2} \w{3,} \d{4} \d{1,2}:\d{2}:\d{2})/,              // 11 August 2025 22:30:00
      
      // International patterns (when enabled)
      ...(this.enableInternational ? [
        // French format
        /(\d{1,2} \w{3,} \d{4} à \d{1,2}h\d{2})/,                 // 11 août 2025 à 22h30
        // German format  
        /(\d{1,2}\. \w{3,} \d{4}, \d{1,2}:\d{2} Uhr)/,            // 11. August 2025, 22:30 Uhr
        // Spanish format
        /(\d{1,2} de \w{3,} de \d{4}, \d{1,2}:\d{2})/,            // 11 de agosto de 2025, 22:30
        // Portuguese format
        /(\d{1,2} de \w{3,} de \d{4} às \d{1,2}h\d{2})/,          // 11 de agosto de 2025 às 22h30
        // Italian format
        /(\d{1,2} \w{3,} \d{4} alle \d{1,2}:\d{2})/,              // 11 agosto 2025 alle 22:30
        // Dutch format
        /(\d{1,2} \w{3,} \d{4} om \d{1,2}:\d{2})/,               // 11 augustus 2025 om 22:30
        // Japanese format (if romanized)
        /(\d{4}年\d{1,2}月\d{1,2}日 \d{1,2}:\d{2})/,             // 2025年8月11日 22:30
      ] : [])
    ]

    // Try patterns on both text and HTML content
    for (const pattern of patterns) {
      // First try text content
      const textMatch = text.match(pattern)
      if (textMatch) {
        return { success: true, rawTimestamp: textMatch[1] }
      }

      // Then try HTML content
      const htmlMatch = html.match(pattern)
      if (htmlMatch) {
        return { success: true, rawTimestamp: htmlMatch[1] }
      }
    }

    return { success: false }
  }

  /**
   * Fallback pattern extraction for edge cases
   */
  private extractWithFallbackPatterns(text: string, html: string): { success: boolean; rawTimestamp?: string } {
    // Look for any 4-digit year followed by reasonable date components
    const fallbackPatterns = [
      // Year-first patterns
      /(\d{4}[-\/\.]\d{1,2}[-\/\.]\d{1,2}[\s,]+\d{1,2}:\d{2})/,
      
      // Month-day-year patterns
      /(\d{1,2}[-\/\.]\d{1,2}[-\/\.]\d{4}[\s,]+\d{1,2}:\d{2})/,
      
      // Named month patterns
      /(\w{3,9} \d{1,2}[-\/\.\,\s]+\d{4}[\s,]+\d{1,2}:\d{2})/,
      
      // Time-first patterns (less reliable)
      /(\d{1,2}:\d{2}:\d{2}.*?\d{4})/,
      
      // Any sequence with year and time
      /(\d{4}.*?\d{1,2}:\d{2})/,
    ]

    for (const pattern of fallbackPatterns) {
      const textMatch = text.match(pattern)
      if (textMatch) {
        return { success: true, rawTimestamp: textMatch[1] }
      }

      const htmlMatch = html.match(pattern)
      if (htmlMatch) {
        return { success: true, rawTimestamp: htmlMatch[1] }
      }
    }

    return { success: false }
  }

  /**
   * Parse raw timestamp string using multiple strategies
   */
  private parseWithMultipleStrategies(rawTimestamp: string): { success: boolean; timestamp?: string; strategy?: string; error?: string } {
    const strategies = [
      () => this.parseWithManualParsing(rawTimestamp),    // Try manual Google Takeout format first
      () => this.parseWithDateFns(rawTimestamp),          // Then try date-fns with cleaned timestamps
      () => this.parseWithNativeDate(rawTimestamp),       // Finally native Date as fallback
    ]

    for (let i = 0; i < strategies.length; i++) {
      try {
        const result = strategies[i]()
        if (result.success) {
          return result
        }
      } catch (error) {
        // Continue to next strategy
      }
    }

    return { success: false, error: 'All parsing strategies failed' }
  }

  /**
   * Parse using date-fns with common Google Takeout formats
   */
  private parseWithDateFns(rawTimestamp: string): { success: boolean; timestamp?: string; strategy?: string; error?: string } {
    // Clean timestamp for parsing - remove timezone abbreviations first
    const cleaned = this.cleanTimestampForParsing(rawTimestamp)
    
    // Common Google Takeout format patterns for date-fns (without timezone tokens)
    const formats = [
      'MMM d, yyyy, h:mm:ss a',        // Aug 11, 2025, 10:30:00 PM (timezone stripped)
      'MMM d, yyyy h:mm:ss a',         // Aug 11, 2025 10:30:00 PM (timezone stripped)
      'M/d/yyyy, h:mm:ss a',           // 8/11/2025, 10:30:00 PM
      'M/d/yyyy h:mm:ss a',            // 8/11/2025 10:30:00 PM
      'yyyy-MM-dd HH:mm:ss',           // 2025-08-11 22:30:00
      'yyyy/MM/dd HH:mm:ss',           // 2025/08/11 22:30:00
      'd.M.yyyy, HH:mm:ss',            // 11.8.2025, 22:30:00
      'd.M.yyyy HH:mm:ss',             // 11.8.2025 22:30:00
      'MMM d, yyyy \'at\' h:mm a',     // Aug 11, 2025 at 10:30 PM
      'd MMMM yyyy, HH:mm:ss',         // 11 August 2025, 22:30:00
      'd MMMM yyyy HH:mm:ss',          // 11 August 2025 22:30:00
    ]

    for (const format of formats) {
      try {
        const parsed = parse(cleaned, format, new Date())
        if (isValidDate(parsed) && this.isReasonableDate(parsed)) {
          return {
            success: true,
            timestamp: parsed.toISOString(),
            strategy: 'date-fns'
          }
        }
      } catch (error) {
        // Continue to next format
      }
    }

    return { success: false, strategy: 'date-fns', error: 'No format matched' }
  }

  /**
   * Parse using native JavaScript Date constructor
   */
  private parseWithNativeDate(rawTimestamp: string): { success: boolean; timestamp?: string; strategy?: string; error?: string } {
    try {
      // Clean and normalize the timestamp
      const cleaned = this.cleanTimestampForParsing(rawTimestamp)
      
      // Try direct parsing
      let parsed = new Date(cleaned)
      if (isNaN(parsed.getTime())) {
        // Try with timezone removal
        const withoutTz = cleaned.replace(/\s(CDT|CST|PDT|PST|EDT|EST|UTC|GMT)\b/gi, '')
        parsed = new Date(withoutTz)
      }

      if (!isNaN(parsed.getTime()) && this.isReasonableDate(parsed)) {
        return {
          success: true,
          timestamp: parsed.toISOString(),
          strategy: 'native-date'
        }
      }

      return { success: false, strategy: 'native-date', error: 'Invalid date result' }
    } catch (error) {
      return { success: false, strategy: 'native-date', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Manual parsing for edge cases and non-standard formats
   */
  private parseWithManualParsing(rawTimestamp: string): { success: boolean; timestamp?: string; strategy?: string; error?: string } {
    try {
      // Match Google Takeout format: Aug 15, 2025, 11:04:01 AM CDT
      const googleTakeout = rawTimestamp.match(/(\w{3}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2}):(\d{2}) (AM|PM)(?:\s+[A-Z]{3,4})?/i)
      if (googleTakeout) {
        const [, monthStr, day, year, hour, minute, second, ampm] = googleTakeout
        
        // Convert month name to number
        const monthMap: { [key: string]: number } = {
          jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
          jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
        }
        const month = monthMap[monthStr.toLowerCase()]
        
        if (month !== undefined) {
          let hour24 = parseInt(hour)
          
          if (ampm.toUpperCase() === 'PM' && hour24 < 12) hour24 += 12
          if (ampm.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0

          const date = new Date(parseInt(year), month, parseInt(day), hour24, parseInt(minute), parseInt(second))
          
          if (!isNaN(date.getTime()) && this.isReasonableDate(date)) {
            return {
              success: true,
              timestamp: date.toISOString(),
              strategy: 'manual-google-takeout'
            }
          }
        }
      }

      // Match MM/DD/YYYY format with time
      const mmddyyyy = rawTimestamp.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/i)
      if (mmddyyyy) {
        const [, month, day, year, hour, minute, second, ampm] = mmddyyyy
        let hour24 = parseInt(hour)
        
        if (ampm.toUpperCase() === 'PM' && hour24 < 12) hour24 += 12
        if (ampm.toUpperCase() === 'AM' && hour24 === 12) hour24 = 0

        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour24, parseInt(minute), parseInt(second))
        
        if (!isNaN(date.getTime()) && this.isReasonableDate(date)) {
          return {
            success: true,
            timestamp: date.toISOString(),
            strategy: 'manual-mmddyyyy'
          }
        }
      }

      // Match "Watched at" pattern
      const watchedAt = rawTimestamp.match(/Watched at (\d{1,2}:\d{2} \w{2}).*?(\w{3} \d{1,2}, \d{4})/)
      if (watchedAt) {
        const [, time, date] = watchedAt
        const combined = `${date}, ${time}`
        const parsed = new Date(combined)
        
        if (!isNaN(parsed.getTime()) && this.isReasonableDate(parsed)) {
          return {
            success: true,
            timestamp: parsed.toISOString(),
            strategy: 'manual-watched-at'
          }
        }
      }

      return { success: false, strategy: 'manual', error: 'No manual parsing pattern matched' }
    } catch (error) {
      return { success: false, strategy: 'manual', error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Clean timestamp string for parsing
   */
  private cleanTimestampForParsing(timestamp: string): string {
    return timestamp
      .replace(/\u202F|\u00A0/g, ' ')  // Non-breaking spaces
      .replace(/\s{2,}/g, ' ')         // Multiple spaces
      .replace(/\s+(CDT|CST|PDT|PST|EDT|EST|UTC|GMT|MST|MDT|AKST|AKDT|HST|HDT)\b/gi, '') // Remove timezone abbreviations for compatibility
      .replace(/\s+(AM|PM)\b/gi, (match) => match.toUpperCase()) // Normalize AM/PM
      .trim()
  }

  /**
   * Validate that a date is reasonable (not too far in past/future)
   */
  private isReasonableDate(date: Date): boolean {
    const year = date.getFullYear()
    const now = new Date()
    
    // Reasonable range: YouTube was founded in 2005, allow up to 1 year in future
    return year >= 2005 && year <= (now.getFullYear() + 1)
  }

  /**
   * Calculate confidence score for timestamp extraction
   */
  private calculateConfidence(rawTimestamp: string, strategy: string, isFallback: boolean): number {
    let confidence = 40 // Lower base confidence
    
    // Strategy-based confidence adjustments (more conservative)
    if (strategy === 'manual-google-takeout') confidence += 25
    else if (strategy === 'date-fns') confidence += 15
    else if (strategy === 'native-date') confidence += 5
    
    // Pattern quality adjustments (more conservative)
    if (rawTimestamp.includes('CDT') || rawTimestamp.includes('CST') || 
        rawTimestamp.includes('PDT') || rawTimestamp.includes('PST') ||
        rawTimestamp.includes('EDT') || rawTimestamp.includes('EST')) confidence += 12
    if (rawTimestamp.includes('AM') || rawTimestamp.includes('PM')) confidence += 8
    if (rawTimestamp.match(/\d{4}/)) confidence += 8 // Has 4-digit year
    if (rawTimestamp.match(/\d{1,2}:\d{2}:\d{2}/)) confidence += 8 // Has seconds
    if (rawTimestamp.match(/\w{3} \d{1,2}, \d{4}/)) confidence += 12 // Google Takeout format
    
    // Additional quality checks
    if (rawTimestamp.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) confidence += 5 // US date format
    if (rawTimestamp.match(/\d{4}-\d{2}-\d{2}/)) confidence += 5 // ISO date format
    
    // Penalties (more aggressive)
    if (isFallback) confidence -= 25
    if (rawTimestamp.length < 10) confidence -= 20 // Very short timestamps
    if (!rawTimestamp.match(/\d{4}/)) confidence -= 30 // No 4-digit year
    if (rawTimestamp.match(/\d{2}\/\d{2}\/\d{4}/)) confidence -= 5 // Ambiguous MM/DD vs DD/MM
    
    // International format penalties (less familiar patterns)
    if (rawTimestamp.match(/\d{1,2}\.\d{1,2}\.\d{4}/)) confidence -= 10 // European dot format
    if (rawTimestamp.includes('à') || rawTimestamp.includes('de') || 
        rawTimestamp.includes('om') || rawTimestamp.includes('alle')) confidence -= 15 // Non-English
    
    return Math.max(0, Math.min(100, confidence))
  }
  
  /**
   * Analyze timestamp quality
   */
  private analyzeQuality(rawTimestamp: string, parsedTimestamp: string): TimestampExtractionResult['quality'] {
    const hasTimezone = /\b(CDT|CST|PDT|PST|EDT|EST|UTC|GMT|MST|MDT|AKST|AKDT|HST|HDT)\b/i.test(rawTimestamp)
    const hasFullDateTime = /\d{1,2}:\d{2}:\d{2}/.test(rawTimestamp)
    const formatRecognized = /\w{3} \d{1,2}, \d{4}/.test(rawTimestamp)
    
    let dateReasonable = false
    try {
      const date = new Date(parsedTimestamp)
      const year = date.getFullYear()
      dateReasonable = year >= 2005 && year <= (new Date().getFullYear() + 1)
    } catch {
      dateReasonable = false
    }
    
    return {
      hasTimezone,
      hasFullDateTime,
      formatRecognized,
      dateReasonable
    }
  }
  
  /**
   * Update strategy success statistics
   */
  private updateStrategyStats(strategy: string, success: boolean) {
    const stats = ResilientTimestampExtractor.extractionStats.strategySuccessRates
    if (!stats.has(strategy)) {
      stats.set(strategy, { attempts: 0, successes: 0 })
    }
    const strategyStats = stats.get(strategy)!
    strategyStats.attempts++
    if (success) strategyStats.successes++
  }
  
  /**
   * Get extraction statistics
   */
  static getExtractionStats() {
    const stats = ResilientTimestampExtractor.extractionStats
    const successRate = stats.totalAttempts > 0 ? (stats.successfulExtractions / stats.totalAttempts) * 100 : 0
    
    const strategyStats = Array.from(stats.strategySuccessRates.entries()).map(([strategy, data]) => ({
      strategy,
      attempts: data.attempts,
      successes: data.successes,
      successRate: data.attempts > 0 ? (data.successes / data.attempts) * 100 : 0
    }))
    
    return {
      totalAttempts: stats.totalAttempts,
      successfulExtractions: stats.successfulExtractions,
      failedExtractions: stats.failedExtractions,
      overallSuccessRate: successRate,
      strategyPerformance: strategyStats
    }
  }
  
  /**
   * Reset extraction statistics
   */
  static resetStats() {
    ResilientTimestampExtractor.extractionStats = {
      totalAttempts: 0,
      successfulExtractions: 0,
      failedExtractions: 0,
      averageConfidence: 0,
      strategySuccessRates: new Map()
    }
  }
  
  /**
   * Enhanced debug logging helper
   */
  private debugLog(result: TimestampExtractionResult, strategy: string, input: string, outcome: 'success' | 'failed', error?: string, confidence?: number, timeMs?: number) {
    if (this.debug && result.debugInfo) {
      const attempt = {
        strategy,
        rawInput: input,
        result: outcome,
        confidence: confidence || 0,
        timeMs: timeMs || 0,
        error
      }
      
      result.debugInfo.attempts.push(attempt)
      
      // Track best attempt
      if (outcome === 'success' && (!result.debugInfo.bestAttempt || (confidence && confidence > result.debugInfo.bestAttempt.confidence))) {
        result.debugInfo.bestAttempt = {
          strategy,
          confidence: confidence || 0,
          timestamp: result.timestamp || ''
        }
      }
    }
  }
}

/**
 * Convenience function for extracting timestamps
 */
export function extractTimestamp(textContent: string, innerHTML: string, options?: TimestampExtractionOptions): TimestampExtractionResult {
  const extractor = new ResilientTimestampExtractor(options)
  return extractor.extractTimestamp(textContent, innerHTML)
}

/**
 * Get global extraction statistics
 */
export function getTimestampExtractionStats() {
  return ResilientTimestampExtractor.getExtractionStats()
}

/**
 * Reset global extraction statistics
 */
export function resetTimestampExtractionStats() {
  ResilientTimestampExtractor.resetStats()
}