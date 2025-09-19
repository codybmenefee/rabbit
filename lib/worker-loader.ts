// Safe Web Worker utilities for client-side parsing
// Keep everything guarded for SSR environments.

import type { ParseWorkerMessage } from './parser.worker'

export interface WorkerSupportInfo {
  canUseWorkers: boolean
  fallbackReason?: string
}

export type MessageType = ParseWorkerMessage['type']

export type MessagePayload<T extends MessageType> = Extract<
  ParseWorkerMessage,
  { type: T }
>

export interface SafeWorker {
  onMessage: <T extends MessageType>(
    type: T,
    handler: (message: MessagePayload<T>) => void
  ) => void
  onError: (handler: (error: ErrorEvent | Error) => void) => void
  postMessage: (data: string) => void
  terminate: () => void
}

export function detectWorkerSupport(): WorkerSupportInfo {
  if (typeof window === 'undefined') {
    return { canUseWorkers: false, fallbackReason: 'SSR' }
  }
  if (typeof Worker === 'undefined') {
    return { canUseWorkers: false, fallbackReason: 'Worker API unavailable' }
  }
  return { canUseWorkers: true }
}

export async function createSafeWorker(): Promise<SafeWorker | null> {
  const support = detectWorkerSupport()
  if (!support.canUseWorkers) return null

  try {
    // Next.js 15+ supports bundling workers via experimental.webpackBuildWorker
    // Worker file lives next to this util in the same folder.
    const worker = new Worker(new URL('./parser.worker.ts', import.meta.url), {
      type: 'module',
      name: 'parser-worker',
    })

    const listeners = new Map<MessageType, Set<Function>>()
    const errorListeners = new Set<Function>()

    const addListener = <T extends MessageType>(type: T, handler: (m: MessagePayload<T>) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(handler)
    }

    worker.addEventListener('message', (evt: MessageEvent<ParseWorkerMessage>) => {
      const msg = evt.data
      const set = listeners.get(msg.type)
      if (set) {
        for (const fn of set) {
          try { (fn as any)(msg) } catch {}
          // swallow handler errors to avoid killing the worker wrapper
        }
      }
    })

    worker.addEventListener('error', (err) => {
      for (const fn of errorListeners) {
        try { (fn as any)(err) } catch {}
      }
    })

    return {
      onMessage: addListener,
      onError: (handler) => { errorListeners.add(handler) },
      postMessage: (data: string) => worker.postMessage(data),
      terminate: () => worker.terminate(),
    }
  } catch (err) {
    // Fallback to main thread
    return null
  }
}

