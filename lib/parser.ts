import { WatchRecord, ImportSummary } from '@/lib/types'

/**
 * Minimal YouTube History Parser
 * Self-contained resilient parser to extract core fields without DOM APIs.
 */
export class YouTubeHistoryParser {
  async parseHTML(htmlContent: string): Promise<WatchRecord[]> {
    const records: WatchRecord[] = []
    if (!htmlContent || typeof htmlContent !== 'string') return records

    // Heuristic: find all video anchors first
    const videoRe = /<a[^>]+href="(https?:\/\/www\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{5,}))[^\"]*"[^>]*>(.*?)<\/a>/gims
    let match: RegExpExecArray | null
    let index = 0

    while ((match = videoRe.exec(htmlContent)) !== null) {
      const fullUrl = safe(match[1])
      const videoId = safe(match[2])
      const videoTitle = cleanText(match[3])

      // Look ahead for channel anchor and timestamp-ish text near this match
      const contextStart = match.index
      const context = htmlContent.slice(contextStart, contextStart + 1200)

      const channelRe = /<a[^>]+href="(https?:\/\/www\.youtube\.com\/(?:channel\/[^\"]+|@[^"]+))"[^>]*>(.*?)<\/a>/ims
      const channelMatch = channelRe.exec(context)
      const channelUrl = channelMatch ? safe(channelMatch[1]) : null
      const channelTitle = channelMatch ? cleanText(channelMatch[2]) : null

      // Attempt to find a reasonable timestamp line near the anchor
      const ts = extractTimestampNearby(context)

      const watchedDate = ts ? new Date(ts) : null
      const deriv = deriveDateParts(watchedDate)

      records.push({
        id: `${videoId || 'record'}_${index++}`,
        watchedAt: watchedDate ? watchedDate.toISOString() : null,
        videoId: videoId || null,
        videoTitle: videoTitle || null,
        videoUrl: fullUrl || null,
        channelTitle: channelTitle || null,
        channelUrl: channelUrl || null,
        product: 'YouTube',
        topics: [],
        year: deriv.year,
        month: deriv.month,
        week: deriv.week,
        dayOfWeek: deriv.dayOfWeek,
        hour: deriv.hour,
        yoyKey: deriv.yoyKey,
        rawTimestamp: ts || undefined,
      })
    }

    return records
  }

  generateSummary(records: WatchRecord[]): ImportSummary {
    const total = records.length
    const channelSet = new Set(records.map(r => r.channelTitle).filter(Boolean))
    const dates = records
      .map(r => (r.watchedAt ? new Date(r.watchedAt) : null))
      .filter((d): d is Date => d instanceof Date)

    const start = dates.length ? new Date(Math.min(...dates.map(d => d.getTime()))) : null
    const end = dates.length ? new Date(Math.max(...dates.map(d => d.getTime()))) : null

    const productBreakdown = records.reduce(
      (acc, r) => {
        if (r.product === 'YouTube Music') acc.youtubeMusic += 1
        else acc.youtube += 1
        return acc
      },
      { youtube: 0, youtubeMusic: 0 }
    )

    return {
      totalRecords: total,
      uniqueChannels: channelSet.size,
      dateRange: { start, end },
      productBreakdown,
      parseErrors: 0,
    }
  }
}

/**
 * Legacy synchronous interface for backward compatibility
 * Note: now simply wraps async implementation.
 */
export class YouTubeHistoryParserLegacy {
  private impl = new YouTubeHistoryParser()
  parseHTML(htmlContent: string): WatchRecord[] {
    let out: WatchRecord[] = []
    let err: unknown
    let done = false
    this.impl
      .parseHTML(htmlContent)
      .then((r) => {
        out = r
        done = true
      })
      .catch((e) => {
        err = e
        done = true
      })
    const start = Date.now()
    while (!done && Date.now() - start < 1000) {
      // brief spin to preserve sync shape (kept minimal)
    }
    if (!done) throw new Error('Parser timeout')
    if (err) throw err
    return out
  }
  generateSummary(records: WatchRecord[]): ImportSummary {
    return this.impl.generateSummary(records)
  }
}

function safe(v: unknown): string | null {
  return typeof v === 'string' && v.length ? v : null
}

function cleanText(html: string): string {
  // Strip tags and decode basic entities
  const withoutTags = html.replace(/<[^>]*>/g, '')
  return decodeEntities(withoutTags).trim()
}

function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

function extractTimestampNearby(context: string): string | null {
  // Common Google Takeout patterns (best-effort)
  const patterns = [
    // Aug 11, 2025, 10:30:00 PM CDT
    /([A-Z][a-z]{2,8} \d{1,2}, \d{4},? \d{1,2}:\d{2}(?::\d{2})? \s?(AM|PM)?(?: [A-Z]{2,5})?)/,
    // 2025-08-11 22:30:00
    /(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(?::\d{2})? ?(?:Z|[+-]\d{2}:?\d{2})?)/,
    // 11.08.2025, 22:30:00
    /(\d{1,2}[./-]\d{1,2}[./-]\d{4},? \d{1,2}:\d{2}(?::\d{2})?)/,
  ]
  for (const re of patterns) {
    const m = re.exec(context)
    if (m && m[1]) {
      const iso = toISO(m[1])
      if (iso) return iso
    }
  }
  return null
}

function toISO(text: string): string | null {
  // Try Date parsing directly; if it yields a valid date, return ISO
  const d = new Date(text)
  if (!isNaN(d.getTime())) return d.toISOString()
  return null
}

function deriveDateParts(d: Date | null): {
  year: number | null
  month: number | null
  week: number | null
  dayOfWeek: number | null
  hour: number | null
  yoyKey: string | null
} {
  if (!d) return { year: null, month: null, week: null, dayOfWeek: null, hour: null, yoyKey: null }
  const year = d.getUTCFullYear()
  const month = d.getUTCMonth() + 1
  // ISO week approximation
  const onejan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getUTCDay() + 1) / 7)
  const dayOfWeek = d.getUTCDay()
  const hour = d.getUTCHours()
  const yoyKey = `${year}-${String(month).padStart(2, '0')}`
  return { year, month, week, dayOfWeek, hour, yoyKey }
}
