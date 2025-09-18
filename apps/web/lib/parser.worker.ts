import type { ImportSummary, WatchRecord } from '@/types/records'
import { YouTubeHistoryParser } from './parser'

// Message types exchanged with the main thread
export type ProgressMessage = {
  type: 'progress'
  percentage: number
  eta: number
  processed: number
}

export type CompleteMessage = {
  type: 'complete'
  records: WatchRecord[]
  summary: ImportSummary
}

export type ErrorMessage = {
  type: 'error'
  error: string
}

export type ParseWorkerMessage = ProgressMessage | CompleteMessage | ErrorMessage

// Worker global scope (narrow type without relying on lib.dom.d.ts in this context)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx: any = self as any

ctx.onmessage = async (event: MessageEvent<string>) => {
  const content = event.data
  const parser = new YouTubeHistoryParser()

  try {
    // Lightweight progress simulation for UX feedback
    post({ type: 'progress', percentage: 5, eta: 0, processed: 0 })

    // Parse in worker
    const records = await parser.parseHTML(content)

    post({ type: 'progress', percentage: 90, eta: 0, processed: records.length })

    const summary = parser.generateSummary(records)

    post({ type: 'complete', records, summary })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error'
    post({ type: 'error', error: message })
  }
}

function post(message: ParseWorkerMessage) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(self as any).postMessage(message)
}

