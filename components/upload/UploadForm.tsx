'use client'

import { useState } from 'react'
import { UploadCloud, CheckCircle2, Loader2, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface UploadResult {
  url: string
  pathname: string
  uploadedAt: string
  size: number
  uploadId: string
  status: string
}

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)

  const processUpload = useAction(api.processing.processUpload)

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault()
    setIsDragging(false)
    const droppedFile = event.dataTransfer.files?.[0]
    if (droppedFile) {
      setFile(droppedFile)
      setResult(null)
      setError(null)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setResult(null)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      setIsUploading(true)
      setError(null)

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Upload failed')
      }

      const data = (await response.json()) as UploadResult
      setResult(data)

      // Automatically start processing the uploaded file
      if (data.uploadId) {
        try {
          setIsProcessing(true)
          await processUpload({ uploadId: data.uploadId as any })
          // Update the result to show processing is complete
          setResult(prev => prev ? { ...prev, status: 'completed' } : null)
        } catch (processError) {
          console.error('Processing failed:', processError)
          setError('Upload successful but processing failed. Please try again.')
        } finally {
          setIsProcessing(false)
        }
      }
    } catch (uploadError) {
      console.error(uploadError)
      setError(uploadError instanceof Error ? uploadError.message : 'Something went wrong')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-full px-4 py-10">
      <Card className="max-w-xl w-full border border-white/[0.08] bg-black/40 backdrop-blur-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <UploadCloud className="w-6 h-6 text-purple-400" />
            Upload Watch History
          </CardTitle>
          <CardDescription className="text-gray-400">
            Drop your Google Takeout `watch-history.html` file here or browse to import it securely to our storage.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <label
            htmlFor="upload-input"
            className={`relative flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed px-6 py-12 text-center transition-all cursor-pointer ${
              isDragging
                ? 'border-purple-500/70 bg-purple-500/10'
                : 'border-white/[0.12] hover:border-purple-500/50 hover:bg-white/[0.04]'
            }`}
            onDragOver={(event) => {
              event.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
          >
            <input
              id="upload-input"
              type="file"
              accept=".html, text/html"
              className="sr-only"
              onChange={handleFileChange}
              disabled={isUploading}
            />

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
              {(isUploading || isProcessing) ? <Loader2 className="h-8 w-8 animate-spin" /> : <UploadCloud className="h-8 w-8" />}
            </div>

            <div className="space-y-1">
              <p className="text-lg font-medium text-white">Select or drag your watch history file</p>
              <p className="text-sm text-gray-400">
                We support the original Google Takeout `watch-history.html` export. Files are stored safely in Vercel Blob storage.
              </p>
            </div>

            {file && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-left text-sm text-gray-300">
                <FileText className="h-5 w-5 text-purple-300" />
                <div className="flex-1 overflow-hidden">
                  <p className="truncate font-medium text-white">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  className="text-xs text-gray-400 hover:text-gray-200"
                  onClick={(event) => {
                    event.preventDefault()
                    setFile(null)
                    setResult(null)
                  }}
                  disabled={isUploading}
                >
                  Clear
                </button>
              </div>
            )}
          </label>

          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">
              Files are encrypted at rest. Each upload gets a unique private Blob URL.
            </div>
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading || isProcessing}
              className="min-w-[140px]"
            >
              {(isUploading || isProcessing) ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isUploading ? 'Uploading...' : 'Processing...'}
                </span>
              ) : (
                'Upload file'
              )}
            </Button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          {result && !error && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
              <div className="flex items-center gap-2 text-emerald-200">
                <CheckCircle2 className="h-5 w-5" /> Upload successful
              </div>
              <ul className="mt-3 space-y-1 text-emerald-100/80">
                <li>Blob URL: <span className="break-all text-emerald-100">{result.url}</span></li>
                <li>Path: <span className="text-emerald-100">{result.pathname}</span></li>
                <li>Uploaded: <span className="text-emerald-100">{new Date(result.uploadedAt).toLocaleString()}</span></li>
                <li>Size: <span className="text-emerald-100">{(result.size / 1024).toFixed(1)} KB</span></li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
