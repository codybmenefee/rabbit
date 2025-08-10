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
      if (!file.name.endsWith('.html')) {
        throw new Error('Please upload a .html file (watch-history.html from Google Takeout)')
      }

      const content = await file.text()
      const parser = new YouTubeHistoryParser()
      const records = parser.parseHTML(content)

      if (records.length === 0) {
        throw new Error('No valid watch records found in the file. Please ensure this is a Google Takeout watch-history.html file.')
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
          "relative border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer",
          isDragging 
            ? "border-purple-400/60 bg-purple-500/10 scale-105 shadow-lg shadow-purple-500/20" 
            : "border-white/[0.08] hover:border-purple-400/40 hover:bg-purple-500/5",
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
        aria-label="Upload YouTube watch history file"
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
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" aria-hidden="true"></div>
              <p className="text-purple-400 font-medium">Processing your YouTube history...</p>
              <p className="text-gray-400 text-sm">This may take a few moments for large files</p>
            </div>
          ) : (
            <>
              <div className="flex justify-center">
                <div className="p-3 bg-purple-500/10 rounded-full">
                  <Upload className="h-8 w-8 text-purple-400" />
                </div>
              </div>

              <div className="space-y-2">
                <h2 className="text-lg font-medium text-white">
                  Upload Your YouTube History
                </h2>
                <p id="file-upload-description" className="text-gray-400 text-sm max-w-md mx-auto">
                  Drag and drop your <strong>watch-history.html</strong> file from Google Takeout, 
                  or click to browse and select the file.
                </p>
              </div>

              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500">
                <FileText className="h-4 w-4" />
                <span>Supports: watch-history.html</span>
              </div>
            </>
          )}
        </div>

        {error && (
          <div 
            className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
            role="alert"
            aria-live="assertive"
          >
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm font-medium">Import Failed</p>
            </div>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}
      </Card>

      <div className="mt-6 space-y-3 text-sm text-gray-400">
        <div className="flex items-start space-x-2">
          <CheckCircle className="h-4 w-4 text-green-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Your data stays private</p>
            <p className="text-gray-500">All processing happens locally in your browser. No data is sent to any server.</p>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <FileText className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">How to get your data</p>
            <p className="text-gray-500">
              Visit <a href="https://takeout.google.com" target="_blank" rel="noopener noreferrer" 
              className="text-blue-400 hover:text-blue-300 underline">Google Takeout</a>, 
              select YouTube and YouTube Music, and download your archive.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}