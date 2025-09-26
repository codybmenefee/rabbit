'use client'

import { useState, useCallback, useRef } from 'react'
import { Upload, FileText, AlertCircle, CheckCircle, Cloud } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'

interface FileUploadProps {
  onUploadComplete: (fileId: string) => void
  onUploadStart: () => void
  className?: string
}

export function FileUploadNew({ onUploadComplete, onUploadStart, className }: FileUploadProps) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadFile = useMutation(api.files.uploadFile)

  const isAuthenticated = !!userId

  const handleFileUpload = useCallback(async (file: File) => {
    if (!isAuthenticated) {
      setError('SIGN_IN_REQUIRED: Please sign in to upload your history')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)
    onUploadStart()

    try {
      // Validate file type
      const isHtml = /\.html?$/i.test(file.name)
      if (!isHtml) {
        throw new Error('INVALID_FILE_FORMAT: Only HTML files are supported (watch-history.html from Google Takeout)')
      }

      // Validate file size (max 100MB)
      const maxSize = 100 * 1024 * 1024 // 100MB
      if (file.size > maxSize) {
        throw new Error('FILE_TOO_LARGE: File must be smaller than 100MB')
      }

      // Upload file to Vercel Blob
      const uploadResult = await uploadToVercelBlob(file)

      // Create file record in Convex
      const { fileId } = await uploadFile({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'text/html',
        storageRef: uploadResult.pathname, // Use pathname as storage reference
        checksum: uploadResult.checksum,
      })

      setUploadProgress(100)
      onUploadComplete(fileId)

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Upload failed:', err)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }, [isAuthenticated, uploadFile, onUploadComplete, onUploadStart])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }, [handleFileUpload])

  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const [isDragging, setIsDragging] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  if (!isLoaded) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-300 rounded w-3/4 mx-auto mb-4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2 mx-auto"></div>
        </div>
      </Card>
    )
  }

  if (!isSignedIn) {
    return (
      <Card className={cn('p-8 text-center', className)}>
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Sign In Required</h3>
        <p className="text-gray-400 mb-4">
          Please sign in to upload your YouTube watch history
        </p>
      </Card>
    )
  }

  return (
    <Card className={cn('p-8', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer',
          isDragging ? 'border-purple-400 bg-purple-50/10' : 'border-gray-300 hover:border-purple-400',
          isUploading && 'pointer-events-none opacity-50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".html"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto"></div>
            <h3 className="text-lg font-semibold text-white">Uploading File...</h3>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-gray-400">
              Uploading {uploadProgress}% complete
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Cloud className="h-12 w-12 text-purple-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Upload Your YouTube Watch History
              </h3>
              <p className="text-gray-400 mb-4">
                Drag and drop your <code className="bg-gray-800 px-2 py-1 rounded">watch-history.html</code> file here,
                or click to browse
              </p>
            </div>
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <FileText className="h-4 w-4" />
              <span>HTML files only • Max 100MB</span>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center space-x-2 text-red-400">
              <AlertCircle className="h-5 w-5" />
              <span className="font-medium">Upload Error</span>
            </div>
            <p className="text-red-300 text-sm mt-1">{error}</p>
          </div>
        )}
      </div>
    </Card>
  )
}

// Helper functions for Vercel Blob storage

async function uploadToVercelBlob(file: File): Promise<{
  url: string
  downloadUrl: string
  pathname: string
  size: number
  checksum: string
}> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Upload failed')
  }

  return response.json()
}
