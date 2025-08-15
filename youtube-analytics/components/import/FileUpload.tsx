'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, X, Cloud, Database } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { watchHistoryStorage } from '@/lib/storage'
import { createHistoricalStorage, HistoricalUploadMetadata } from '@/lib/historical-storage'
import { ImportSummary } from '@/types/records'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { ParseWorkerMessage } from '@/lib/parser.worker'
import { createSafeWorker, detectWorkerSupport, SafeWorker } from '@/lib/worker-loader'
import { YouTubeHistoryParser } from '@/lib/parser'

interface FileUploadProps {
  onImportComplete: (summary: ImportSummary) => void
  onImportStart: () => void
  className?: string
}

export function FileUpload({ onImportComplete, onImportStart, className }: FileUploadProps) {
  const { data: session, status } = useSession()
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<{ percentage: number; eta: number; processed: number } | null>(null)
  const [workerSupport, setWorkerSupport] = useState(detectWorkerSupport())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const workerRef = useRef<SafeWorker | null>(null)

  // Determine storage strategy based on authentication
  const isAuthenticated = status === 'authenticated' && session?.user?.id
  const storageMode = isAuthenticated ? 'historical' : 'session'

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true)
    setError(null)
    setProgress(null)
    onImportStart()

    try {
      const isHtml = /\.html?$/i.test(file.name)
      if (!isHtml) {
        throw new Error('INVALID_FILE_FORMAT: .html required (watch-history.html from Google Takeout)')
      }

      const content = await file.text()
      
      // Try to use Web Worker if supported, otherwise fallback to main thread
      if (workerSupport.canUseWorkers) {
        await processWithWorker(content, file)
      } else {
        await processWithMainThread(content, file)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Import failed:', err)
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }, [onImportComplete, onImportStart, workerSupport, isAuthenticated, session])

  const processWithWorker = useCallback(async (content: string, file: File) => {
    const worker = await createSafeWorker()
    if (!worker) {
      // Fallback to main thread if worker creation fails
      return processWithMainThread(content, file)
    }

    workerRef.current = worker

    return new Promise<void>((resolve, reject) => {
      worker.onMessage('progress', (message) => {
        setProgress({
          percentage: message.percentage,
          eta: message.eta,
          processed: message.processed
        })
      })

      worker.onMessage('complete', async (message) => {
        try {
          const { records, summary } = message
          
          if (records.length === 0) {
            throw new Error('NO_VALID_DATA_STREAMS: Ensure file is Google Takeout watch-history.html format')
          }

          const metadata = {
            uploadedAt: new Date().toISOString(),
            fileName: file.name,
            fileSize: file.size,
            recordCount: records.length
          } as HistoricalUploadMetadata

          // Route to appropriate storage based on authentication
          if (isAuthenticated && session?.user?.id) {
            const historicalStorage = createHistoricalStorage(session.user.id)
            await historicalStorage.saveUpload(records, metadata, summary)
          } else {
            // Session storage metadata for compatibility
            const sessionMetadata = {
              importedAt: metadata.uploadedAt,
              fileName: metadata.fileName,
              fileSize: metadata.fileSize
            }
            await watchHistoryStorage.saveRecords(records, sessionMetadata, summary)
          }

          onImportComplete(summary)
          resolve()
        } catch (err) {
          reject(err)
        } finally {
          worker.terminate()
          workerRef.current = null
        }
      })

      worker.onMessage('error', (message) => {
        worker.terminate()
        workerRef.current = null
        reject(new Error(message.error))
      })

      worker.onError((error) => {
        worker.terminate()
        workerRef.current = null
        reject(error)
      })

      // Start processing
      worker.postMessage(content)
    })
  }, [onImportComplete, isAuthenticated, session])

  const processWithMainThread = useCallback(async (content: string, file: File) => {
    console.warn('Using main thread parsing:', workerSupport.fallbackReason || 'Web Workers not available')
    
    try {
      const parser = new YouTubeHistoryParser()
      
      // Simulate progress for main thread processing
      setProgress({ percentage: 0, eta: 0, processed: 0 })
      
      const records = await parser.parseHTML(content)
      const summary = parser.generateSummary(records)
      
      setProgress({ percentage: 100, eta: 0, processed: records.length })

      if (records.length === 0) {
        throw new Error('NO_VALID_DATA_STREAMS: Ensure file is Google Takeout watch-history.html format')
      }

      const metadata = {
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
        fileSize: file.size,
        recordCount: records.length
      } as HistoricalUploadMetadata

      // Route to appropriate storage based on authentication
      if (isAuthenticated && session?.user?.id) {
        const historicalStorage = createHistoricalStorage(session.user.id)
        await historicalStorage.saveUpload(records, metadata, summary)
      } else {
        // Session storage metadata for compatibility
        const sessionMetadata = {
          importedAt: metadata.uploadedAt,
          fileName: metadata.fileName,
          fileSize: metadata.fileSize
        }
        await watchHistoryStorage.saveRecords(records, sessionMetadata, summary)
      }

      onImportComplete(summary)
    } catch (err) {
      throw err
    }
  }, [onImportComplete, workerSupport, isAuthenticated, session])

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await processFile(files[0])
    }
  }, [processFile])

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await processFile(files[0])
    }
  }, [processFile])

  const handleClick = useCallback(() => {
    if (!isProcessing) {
      fileInputRef.current?.click()
    }
  }, [isProcessing])

  const handleCancel = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate()
      workerRef.current = null
    }
    setIsProcessing(false)
    setProgress(null)
    setError(null)
  }, [])

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
      }
    }
  }, [])

  return (
    <div className={className}>
      <Card
        className={cn(
          "relative border-2 border-dashed p-8 text-center transition-all duration-300 cursor-pointer",
          isDragging 
            ? "border-signal-green-400/60 bg-signal-green-500/10 scale-105 shadow-lg shadow-signal-green-500/20" 
            : "border-terminal-border hover:border-signal-green-400/40 hover:bg-signal-green-500/5",
          isProcessing && "opacity-50 pointer-events-none"
        )}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={isProcessing ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleClick()
          }
        }}
        aria-label="Initialize data stream upload"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".html"
          onChange={handleFileSelect}
          className="sr-only"
          disabled={isProcessing}
          aria-describedby="file-upload-description"
        />

        <div className="space-y-4">
          {isProcessing ? (
            <div 
              className="flex flex-col items-center space-y-3"
              role="status"
              aria-live="polite"
              aria-label="Processing file"
            >
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-signal-green-500" aria-hidden="true"></div>
              <p className="text-signal-green-400 font-medium terminal-text">PROCESSING_DATA_STREAM...</p>
              
              {progress ? (
                <div className="space-y-2 text-center">
                  <div className="w-64 bg-terminal-border rounded-full h-2">
                    <div 
                      className="bg-signal-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-terminal-muted terminal-text">
                    <span>{Math.round(progress.percentage)}% complete</span>
                    <span>{progress.processed} records</span>
                    {progress.eta > 0 && (
                      <span>~{Math.round(progress.eta)}s remaining</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-terminal-muted text-sm terminal-text">INITIALIZING_PARSER...</p>
              )}
              
              <button
                onClick={handleCancel}
                className="flex items-center space-x-2 text-signal-red-400 hover:text-signal-red-300 text-sm terminal-text"
                type="button"
              >
                <X className="h-4 w-4" />
                <span>CANCEL_OPERATION</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="p-3 terminal-surface rounded-lg">
                  <Upload className="h-8 w-8 signal-green" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-medium text-terminal-text terminal-text">
                  INITIALIZE_DATA_STREAM
                </h2>
                <p id="file-upload-description" className="text-terminal-muted text-sm max-w-md mx-auto terminal-text">
                  Drop <strong>watch-history.html</strong> from Google Takeout, 
                  or click to select file for processing.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 text-xs text-terminal-muted terminal-text">
                <FileText className="h-4 w-4" />
                <span>ACCEPTS: watch-history.html</span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div 
            className="mt-4 p-4 bg-signal-red-500/10 border border-signal-red-500/20 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center space-x-2 signal-red">
              <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium terminal-text">IMPORT_FAILED</p>
            </div>
            <p className="signal-red text-sm mt-1 terminal-text">{error}</p>
          </div>
        )}
      </Card>

      <div className="mt-6 space-y-3 text-sm text-terminal-muted terminal-text">
        <div className="flex items-start space-x-2">
          <CheckCircle className="h-4 w-4 signal-green mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">LOCAL_PROCESSING_ONLY</p>
            <p className="text-terminal-muted">All processing happens locally. No data transmission to external servers.</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          {isAuthenticated ? (
            <Cloud className="h-4 w-4 signal-blue mt-0.5 flex-shrink-0" />
          ) : (
            <Database className="h-4 w-4 signal-orange mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {isAuthenticated ? 'HISTORICAL_STORAGE' : 'SESSION_STORAGE'}
            </p>
            <p className="text-terminal-muted">
              {isAuthenticated 
                ? 'Data will be permanently stored and merged with your history across uploads.'
                : 'Data stored temporarily in browser session. Sign in to enable permanent historical storage.'
              }
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <FileText className="h-4 w-4 signal-orange mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">DATA_ACQUISITION_PROTOCOL</p>
            <p className="text-terminal-muted">
              Access <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" 
              className="signal-orange hover:text-signal-orange-300 underline">Google Takeout</a>, 
              select YouTube and YouTube Music, download archive.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          {workerSupport.canUseWorkers ? (
            <CheckCircle className="h-4 w-4 signal-green mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 signal-orange mt-0.5 flex-shrink-0" />
          )}
          <div>
            <p className="font-medium">
              {workerSupport.canUseWorkers ? 'OPTIMIZED_PROCESSING' : 'COMPATIBILITY_MODE'}
            </p>
            <p className="text-terminal-muted">
              {workerSupport.canUseWorkers 
                ? 'Web Workers enabled for non-blocking processing of large files.'
                : `Main thread processing active. ${workerSupport.fallbackReason || 'Reduced performance for large files.'}`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}