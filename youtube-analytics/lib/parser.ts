import { WatchRecord, ImportSummary } from '@/types/records'
import { YouTubeHistoryParserCore, ClientProcessingStrategy } from './parser-core'

/**
 * Main thread YouTube History Parser
 * Lightweight wrapper around shared core implementation
 */
export class YouTubeHistoryParser {
  private strategy = new ClientProcessingStrategy()

  async parseHTML(htmlContent: string): Promise<WatchRecord[]> {
    return this.strategy.parseHTML(htmlContent)
  }

  generateSummary(records: WatchRecord[]): ImportSummary {
    return this.strategy.generateSummary(records)
  }
}

/**
 * Legacy synchronous interface for backward compatibility
 * @deprecated Use async parseHTML instead
 */
export class YouTubeHistoryParserLegacy {
  private core = new YouTubeHistoryParserCore()

  parseHTML(htmlContent: string): WatchRecord[] {
    // Create a synchronous wrapper by spinning the event loop
    let result: WatchRecord[] = []
    let error: Error | null = null
    let completed = false

    this.core.parseHTML(htmlContent).then(records => {
      result = records
      completed = true
    }).catch(err => {
      error = err
      completed = true
    })

    // Spin until completion (blocking - not recommended for large files)
    const start = Date.now()
    while (!completed && Date.now() - start < 30000) { // 30s timeout
      // Busy wait - not ideal but maintains synchronous interface
    }

    if (error) {
      throw error
    }
    
    if (!completed) {
      throw new Error('Parser timeout - file too large for synchronous processing')
    }

    return result
  }

  generateSummary(records: WatchRecord[]): ImportSummary {
    return this.core.generateSummary(records)
  }
}