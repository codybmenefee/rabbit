'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import { YouTubeHistoryParser } from '@/lib/parser'
import { watchHistoryStorage } from '@/lib/storage'
import { ImportSummary } from '@/types/records'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onImportComplete: (summary: ImportSummary) => void
  onImportStart: () => void
  className?: string
}

export function FileUpload({ onImportComplete, onImportStart, className }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true)
    setError(null)
    onImportStart()

    try {
      const isHtml = /\.html?$/i.test(file.name)
      if (!isHtml) {
        throw new Error('INVALID_FILE_FORMAT: .html required (watch-history.html from Google Takeout)')
      }

      const content = await file.text()
      const parser = new YouTubeHistoryParser()
      const records = parser.parseHTML(content)

      if (records.length === 0) {
        throw new Error('NO_VALID_DATA_STREAMS: Ensure file is Google Takeout watch-history.html format')
      }

      const summary = parser.generateSummary(records)
      const metadata = {
        importedAt: new Date().toISOString(),
        fileName: file.name,
        fileSize: file.size
      }

      await watchHistoryStorage.saveRecords(records, metadata, summary)
      onImportComplete(summary)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Import failed:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [onImportComplete, onImportStart])

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
    fileInputRef.current?.click()
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
              <p className="text-terminal-muted text-sm terminal-text">PARSING_LARGE_DATA_SET</p>
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
      </div>
    </div>
  )
}