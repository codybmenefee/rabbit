/**
 * Production-safe Web Worker loader with fallback support
 */

import { ParseWorkerMessage } from './parser.worker'

export interface WorkerSupport {
  isSupported: boolean
  canUseWorkers: boolean
  fallbackReason?: string
}

/**
 * Detect Web Worker support and availability
 */
export function detectWorkerSupport(): WorkerSupport {
  // Check if Worker is available
  if (typeof Worker === 'undefined') {
    return {
      isSupported: false,
      canUseWorkers: false,
      fallbackReason: 'Web Workers not supported in this environment'
    }
  }

  // Check if we're in a secure context (required for some Worker features)
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    return {
      isSupported: true,
      canUseWorkers: false,
      fallbackReason: 'Web Workers require secure context (HTTPS)'
    }
  }

  // Check if import.meta.url is available (needed for module workers)
  if (typeof import.meta === 'undefined' || !import.meta.url) {
    return {
      isSupported: true,
      canUseWorkers: false,
      fallbackReason: 'Module workers not supported (import.meta.url unavailable)'
    }
  }

  return {
    isSupported: true,
    canUseWorkers: true
  }
}

/**
 * Create Web Worker with production-safe loading
 */
export async function createWorker(): Promise<Worker | null> {
  const support = detectWorkerSupport()
  
  if (!support.canUseWorkers) {
    console.warn('Cannot use Web Workers:', support.fallbackReason)
    return null
  }

  try {
    // Try different loading strategies based on environment
    if (process.env.NODE_ENV === 'production') {
      // Production: Create worker from blob URL for better compatibility
      return await createWorkerFromBlob()
    } else {
      // Development: Use direct module import
      return createWorkerFromModule()
    }
  } catch (error) {
    console.warn('Failed to create Web Worker:', error)
    return null
  }
}

/**
 * Create worker from module URL (development)
 */
function createWorkerFromModule(): Worker {
  try {
    // Use the module worker syntax for development
    return new Worker(new URL('./parser.worker.ts', import.meta.url), {
      type: 'module'
    })
  } catch (error) {
    // Fallback to classic worker if module worker fails
    return new Worker(new URL('./parser.worker.ts', import.meta.url))
  }
}

/**
 * Create worker from blob URL (production)
 */
async function createWorkerFromBlob(): Promise<Worker> {
  try {
    // Import the worker code as a string
    const workerModule = await import('./parser.worker?worker&url')
    const workerUrl = workerModule.default
    
    // Create worker from the imported URL
    return new Worker(workerUrl, { type: 'module' })
  } catch (error) {
    // Fallback: create blob worker from inline code
    return createInlineWorker()
  }
}

/**
 * Create worker from inline blob (ultimate fallback)
 */
function createInlineWorker(): Worker {
  const workerCode = `
    import { YouTubeHistoryParserCore } from './parser-core.js';
    
    // Worker message types
    const parseProgressUpdate = (processed, total, percentage, eta, currentChunk, totalChunks) => ({
      type: 'progress',
      processed,
      total,
      percentage,
      eta,
      currentChunk,
      totalChunks
    });
    
    const parseCompleteMessage = (records, summary) => ({
      type: 'complete',
      records,
      summary
    });
    
    const parseErrorMessage = (error) => ({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    });
    
    // Worker message handler
    self.addEventListener('message', async (event) => {
      try {
        const htmlContent = event.data;
        const parser = new YouTubeHistoryParserCore();
        
        const onProgress = (processed, total, percentage, eta, currentChunk, totalChunks) => {
          self.postMessage(parseProgressUpdate(processed, total, percentage, eta, currentChunk, totalChunks));
        };
        
        const records = await parser.parseHTML(htmlContent, { onProgress });
        const summary = parser.generateSummary(records);
        
        self.postMessage(parseCompleteMessage(records, summary));
      } catch (error) {
        self.postMessage(parseErrorMessage(error));
      }
    });
  `

  const blob = new Blob([workerCode], { type: 'application/javascript' })
  const workerUrl = URL.createObjectURL(blob)
  
  const worker = new Worker(workerUrl, { type: 'module' })
  
  // Clean up blob URL when worker terminates
  worker.addEventListener('error', () => URL.revokeObjectURL(workerUrl))
  worker.addEventListener('messageerror', () => URL.revokeObjectURL(workerUrl))
  
  return worker
}

/**
 * Enhanced worker wrapper with automatic cleanup and error handling
 */
export class SafeWorker {
  private worker: Worker | null = null
  private isTerminated = false
  private messageHandlers = new Map<string, (data: any) => void>()
  private errorHandlers: ((error: Error) => void)[] = []

  constructor(worker: Worker) {
    this.worker = worker
    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    if (!this.worker) return

    this.worker.onmessage = (event: MessageEvent<ParseWorkerMessage>) => {
      const message = event.data
      const handler = this.messageHandlers.get(message.type)
      if (handler) {
        handler(message)
      }
    }

    this.worker.onerror = (error) => {
      const errorObj = new Error(`Worker error: ${error.message}`)
      this.errorHandlers.forEach(handler => handler(errorObj))
    }

    this.worker.onmessageerror = (error) => {
      const errorObj = new Error(`Worker message error: ${error.type}`)
      this.errorHandlers.forEach(handler => handler(errorObj))
    }
  }

  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler)
  }

  onError(handler: (error: Error) => void) {
    this.errorHandlers.push(handler)
  }

  postMessage(data: any) {
    if (this.worker && !this.isTerminated) {
      this.worker.postMessage(data)
    }
  }

  terminate() {
    if (this.worker && !this.isTerminated) {
      this.worker.terminate()
      this.isTerminated = true
      this.messageHandlers.clear()
      this.errorHandlers.length = 0
    }
  }

  get terminated() {
    return this.isTerminated
  }
}

/**
 * Factory function to create a safe worker instance
 */
export async function createSafeWorker(): Promise<SafeWorker | null> {
  const worker = await createWorker()
  return worker ? new SafeWorker(worker) : null
}