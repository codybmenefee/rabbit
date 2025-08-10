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
    
    const entries = doc.querySelectorAll('.outer-cell.mdl-cell.mdl-cell--12-col.mdl-shadow--2dp')
    const records: WatchRecord[] = []
    
    entries.forEach(entry => {
      const parsed = this.parseEntry(entry)
      if (parsed && !parsed.isAd) {
        const normalized = this.normalizeRecord(parsed)
        if (normalized) {
          records.push(normalized)
        }
      }
    })
    
    return records
  }

  private parseEntry(entry: Element): ParsedEntry | null {
    const contentCells = entry.querySelectorAll('.content-cell')
    if (contentCells.length === 0) return null
    
    const mainContent = contentCells[0]
    const text = mainContent.textContent || ''
    const innerHTML = mainContent.innerHTML || ''
    
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
    const productsSection = entry.querySelector('.content-cell .mdl-typography--caption')
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
        // Parse timestamp like "Jun 23, 2025, 11:42:47 PM CDT"
        const date = new Date(parsed.timestamp.replace(' CDT', '').replace(' CST', ''))
        if (!isNaN(date.getTime())) {
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
    return btoa(hashInput).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)
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