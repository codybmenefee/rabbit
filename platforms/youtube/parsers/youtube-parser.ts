/**
 * YouTube History Parser
 * Implements the base parser interface for YouTube data
 */

import { BaseParser, ParserOptions, ParserProgress } from '../../../packages/core/parsers/base/parser.interface'
import { YouTubeRecord, YouTubeParserConfig, YouTubeImportSummary } from '../types'
import { BaseParserResult } from '../../../packages/core/types'

export class YouTubeParser implements BaseParser<YouTubeRecord> {
  private config: YouTubeParserConfig = {
    platform: 'YouTube',
    version: '1.0.0',
    supportedFormats: ['html', 'json'],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    supportedProducts: ['YouTube', 'YouTube Music']
  }

  async parse(file: File): Promise<BaseParserResult<YouTubeRecord>> {
    if (!this.canParse(file)) {
      throw new Error(`Unsupported file format: ${file.type}`)
    }

    const content = await this.readFile(file)
    return this.parseString(content, file.name)
  }

  async parseString(data: string, filename: string): Promise<BaseParserResult<YouTubeRecord>> {
    const startTime = performance.now()
    const records: YouTubeRecord[] = []
    const errors: string[] = []

    try {
      // Parse HTML content
      const parser = new DOMParser()
      const doc = parser.parseFromString(data, 'text/html')
      
      // Extract records from HTML
      const entries = this.extractEntries(doc)
      
      for (const entry of entries) {
        try {
          const record = this.parseEntry(entry)
          if (record) {
            records.push(record)
          }
        } catch (error) {
          errors.push(`Failed to parse entry: ${error}`)
        }
      }

      const parseTime = performance.now() - startTime
      const successRate = entries.length > 0 ? (records.length / entries.length) * 100 : 0

      return {
        records,
        metadata: {
          totalRecords: records.length,
          parseTime,
          successRate,
          errors
        },
        summary: this.generateSummary(records)
      }
    } catch (error) {
      throw new Error(`Failed to parse YouTube data: ${error}`)
    }
  }

  canParse(file: File): boolean {
    const supportedTypes = ['text/html', 'application/json']
    const supportedExtensions = ['.html', '.json']
    
    return (
      supportedTypes.includes(file.type) ||
      supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
    ) && file.size <= this.getMaxFileSize()
  }

  getConfig(): YouTubeParserConfig {
    return this.config
  }

  getSupportedFormats(): string[] {
    return this.config.supportedFormats
  }

  getMaxFileSize(): number {
    return this.config.maxFileSize
  }

  private async readFile(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })
  }

  private extractEntries(doc: Document): Element[] {
    // Look for YouTube history entries in various formats
    const selectors = [
      '.content-cell',
      '.outer-cell',
      '[data-activity-type="watch"]'
    ]

    for (const selector of selectors) {
      const elements = doc.querySelectorAll(selector)
      if (elements.length > 0) {
        return Array.from(elements)
      }
    }

    return []
  }

  private parseEntry(entry: Element): YouTubeRecord | null {
    try {
      const text = entry.textContent || ''
      const html = entry.innerHTML || ''

      // Extract timestamp
      const timestamp = this.extractTimestamp(text, html)
      
      // Extract video title
      const videoTitle = this.extractVideoTitle(text, html)
      
      // Extract channel title
      const channelTitle = this.extractChannelTitle(text, html)
      
      // Extract product type
      const product = this.extractProduct(text, html)
      
      // Generate unique ID
      const id = this.generateId(timestamp, videoTitle, channelTitle)
      
      // Classify topics
      const topics = this.classifyTopics(videoTitle, channelTitle)
      
      // Compute date fields
      const dateFields = this.computeDateFields(timestamp)

      return {
        id,
        title: videoTitle,
        creator: channelTitle,
        platform: 'YouTube',
        consumedAt: timestamp,
        duration: null, // Not available in takeout data
        url: null, // Not available in takeout data
        topics,
        product,
        channelTitle,
        videoTitle,
        ...dateFields
      }
    } catch (error) {
      console.error('Failed to parse entry:', error)
      return null
    }
  }

  private extractTimestamp(text: string, html: string): string | null {
    // Multiple timestamp extraction strategies
    const patterns = [
      /(\w{3} \d{1,2}, \d{4}, \d{1,2}:\d{2}:\d{2} \w{2} \w{3})/,
      /(\d{1,2}\/\d{1,2}\/\d{4}, \d{1,2}:\d{2}:\d{2} \w{2})/,
      /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern) || html.match(pattern)
      if (match) {
        return match[1]
      }
    }

    return null
  }

  private extractVideoTitle(text: string, html: string): string | null {
    // Extract video title from various formats
    const patterns = [
      /Watched (.+?) on YouTube/,
      /Watched (.+?) on YouTube Music/,
      /<a[^>]*>([^<]+)<\/a>/
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern) || html.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return null
  }

  private extractChannelTitle(text: string, html: string): string | null {
    // Extract channel title
    const patterns = [
      /Watched .+? on (.+?) on YouTube/,
      /Watched .+? on (.+?) on YouTube Music/,
      /Channel: (.+?)/
    ]

    for (const pattern of patterns) {
      const match = text.match(pattern) || html.match(pattern)
      if (match && match[1]) {
        return match[1].trim()
      }
    }

    return null
  }

  private extractProduct(text: string, html: string): 'YouTube' | 'YouTube Music' {
    return text.includes('YouTube Music') || html.includes('YouTube Music') 
      ? 'YouTube Music' 
      : 'YouTube'
  }

  private generateId(timestamp: string | null, title: string | null, channel: string | null): string {
    const parts = [timestamp, title, channel].filter(Boolean)
    return btoa(parts.join('|')).replace(/[^a-zA-Z0-9]/g, '')
  }

  private classifyTopics(title: string | null, channel: string | null): string[] {
    const text = `${title || ''} ${channel || ''}`.toLowerCase()
    const topics: string[] = []

    const topicKeywords = {
      tech: ['programming', 'coding', 'software', 'tech', 'ai', 'machine learning', 'python', 'javascript'],
      business: ['business', 'entrepreneur', 'marketing', 'finance', 'startup', 'investing'],
      entertainment: ['funny', 'comedy', 'music', 'movie', 'gaming', 'entertainment'],
      education: ['tutorial', 'learn', 'course', 'education', 'how to', 'explained'],
      news: ['news', 'politics', 'current events', 'breaking'],
      health: ['health', 'fitness', 'workout', 'nutrition', 'medical'],
      science: ['science', 'research', 'study', 'experiment', 'physics', 'chemistry'],
      lifestyle: ['lifestyle', 'travel', 'cooking', 'fashion', 'beauty', 'home']
    }

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        topics.push(topic)
      }
    }

    return topics.length > 0 ? topics : ['Other']
  }

  private computeDateFields(timestamp: string | null): Partial<YouTubeRecord> {
    if (!timestamp) {
      return {
        year: null,
        month: null,
        week: null,
        dayOfWeek: null,
        hour: null,
        yoyKey: null
      }
    }

    try {
      const date = new Date(timestamp)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const week = Math.ceil(date.getDate() / 7)
      const dayOfWeek = date.getDay()
      const hour = date.getHours()
      const yoyKey = `${month}-${week}`

      return {
        year,
        month,
        week,
        dayOfWeek,
        hour,
        yoyKey
      }
    } catch {
      return {
        year: null,
        month: null,
        week: null,
        dayOfWeek: null,
        hour: null,
        yoyKey: null
      }
    }
  }

  private generateSummary(records: YouTubeRecord[]): any {
    const channels = new Map<string, number>()
    const topics = new Map<string, number>()
    const products = { youtube: 0, youtubeMusic: 0 }
    const dates = records.map(r => r.consumedAt).filter(Boolean).sort()

    records.forEach(record => {
      if (record.channelTitle) {
        channels.set(record.channelTitle, (channels.get(record.channelTitle) || 0) + 1)
      }
      
      record.topics.forEach(topic => {
        topics.set(topic, (topics.get(topic) || 0) + 1)
      })

      if (record.product === 'YouTube') {
        products.youtube++
      } else if (record.product === 'YouTube Music') {
        products.youtubeMusic++
      }
    })

    return {
      dateRange: {
        start: dates[0] || null,
        end: dates[dates.length - 1] || null
      },
      topCreators: Array.from(channels.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      topTopics: Array.from(topics.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }))
    }
  }
}
