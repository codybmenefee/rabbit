import { WatchRecord, ImportSummary } from '../types/records'
import { YouTubeHistoryParserCore } from './parser-core'

export interface ParseProgressUpdate {
  type: 'progress'
  processed: number
  total: number
  percentage: number
  eta: number // seconds remaining
  currentChunk: number
  totalChunks: number
}

export interface ParseCompleteMessage {
  type: 'complete'
  records: WatchRecord[]
  summary: ImportSummary
}

export interface ParseErrorMessage {
  type: 'error'
  error: string
}

export type ParseWorkerMessage = ParseProgressUpdate | ParseCompleteMessage | ParseErrorMessage

// Worker context check - handle various worker environments
declare const self: Worker & {
  postMessage: (message: any) => void;
  addEventListener: (type: string, listener: (event: any) => void) => void;
}
export default {} as typeof Worker & (new () => Worker)

// Worker message handler
self.addEventListener('message', async (event: MessageEvent<string>) => {
  try {
    const htmlContent = event.data
    const parser = new YouTubeHistoryParserCore()
    
    // Set up progress callback
    const onProgress = (processed: number, total: number, percentage: number, eta: number, currentChunk: number, totalChunks: number) => {
      const progressMessage: ParseProgressUpdate = {
        type: 'progress',
        processed,
        total,
        percentage,
        eta,
        currentChunk,
        totalChunks
      }
      self.postMessage(progressMessage)
    }
    
    const records = await parser.parseHTML(htmlContent, { onProgress })
    const summary = parser.generateSummary(records)
    
    const completeMessage: ParseCompleteMessage = {
      type: 'complete',
      records,
      summary
    }
    
    self.postMessage(completeMessage)
  } catch (error) {
    const errorMessage: ParseErrorMessage = {
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    }
    
    self.postMessage(errorMessage)
  }
})