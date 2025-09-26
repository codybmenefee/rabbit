'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Clock, AlertCircle, FileText, Trash2 } from 'lucide-react'
import { useAuth } from '@clerk/nextjs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

interface FileStatusProps {
  className?: string
}

export function FileStatus({ className }: FileStatusProps) {
  const { isLoaded, isSignedIn, userId } = useAuth()
  const [selectedFileId, setSelectedFileId] = useState<Id<'uploaded_files'> | null>(null)

  const files = useQuery(api.files.getUserFiles)
  const fileStatus = useQuery(
    api.files.getFileStatus,
    selectedFileId ? { fileId: selectedFileId } : 'skip'
  )
  const deleteFile = useMutation(api.files.deleteFile)

  // Auto-refresh file status every 5 seconds
  useEffect(() => {
    if (!files) return

    const interval = setInterval(() => {
      // Trigger a refetch by updating a dummy state
      setSelectedFileId(prev => prev)
    }, 5000)

    return () => clearInterval(interval)
  }, [files])

  const handleDeleteFile = async (fileId: Id<'uploaded_files'>) => {
    if (!confirm('Are you sure you want to delete this file?')) return
    
    try {
      await deleteFile({ fileId })
      if (selectedFileId === fileId) {
        setSelectedFileId(null)
      }
    } catch (error) {
      console.error('Failed to delete file:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'processing':
        return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <FileText className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'uploaded':
        return 'Uploaded - Processing will start soon'
      case 'processing':
        return 'Processing - Extracting video data'
      case 'completed':
        return 'Completed - Data ready for analysis'
      case 'failed':
        return 'Failed - Check error details'
      default:
        return 'Unknown status'
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  if (!isLoaded || !isSignedIn) {
    return null
  }

  if (!files || files.length === 0) {
    return (
      <Card className={className}>
        <div className="p-6 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Files Uploaded</h3>
          <p className="text-gray-400">
            Upload your YouTube watch history to get started
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className={className}>
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Uploaded Files</h3>
        
        <div className="space-y-3">
          {files.map((file) => (
            <div
              key={file._id}
              className={cn(
                'p-4 rounded-lg border cursor-pointer transition-colors',
                selectedFileId === file._id
                  ? 'border-purple-500 bg-purple-50/10'
                  : 'border-gray-700 hover:border-gray-600'
              )}
              onClick={() => setSelectedFileId(file._id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(file.status)}
                  <div>
                    <p className="font-medium text-white">{file.fileName}</p>
                    <p className="text-sm text-gray-400">
                      {formatFileSize(file.fileSize)} • {formatDate(file.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">
                    {getStatusText(file.status)}
                  </span>
                  
                  {['failed', 'completed'].includes(file.status) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteFile(file._id)
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {file.recordCount && (
                <div className="mt-2 text-sm text-gray-400">
                  Extracted {file.recordCount.toLocaleString()} video records
                </div>
              )}

              {file.errorMessage && (
                <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-sm text-red-300">
                  {file.errorMessage}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {fileStatus && (
        <Card className="mt-4 p-6">
          <h4 className="text-md font-semibold text-white mb-3">Processing Details</h4>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Status:</span>
              <span className="ml-2 text-white">{fileStatus.status}</span>
            </div>
            
            {fileStatus.processingStartedAt && (
              <div>
                <span className="text-gray-400">Started:</span>
                <span className="ml-2 text-white">{formatDate(fileStatus.processingStartedAt)}</span>
              </div>
            )}
            
            {fileStatus.processingCompletedAt && (
              <div>
                <span className="text-gray-400">Completed:</span>
                <span className="ml-2 text-white">{formatDate(fileStatus.processingCompletedAt)}</span>
              </div>
            )}
            
            {fileStatus.recordCount && (
              <div>
                <span className="text-gray-400">Records:</span>
                <span className="ml-2 text-white">{fileStatus.recordCount.toLocaleString()}</span>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function cn(...classes: (string | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
