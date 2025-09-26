'use client'

import { useState, useEffect } from 'react'
import { FileUploadNew } from './FileUploadNew'
import { FileStatus } from './FileStatus'
import { ProcessingScreen } from './ProcessingScreen'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'

interface ImportPageWithProcessingProps {
  onImportComplete: () => void
  className?: string
}

type ImportState = 'upload' | 'processing' | 'monitoring' | 'completed'

export function ImportPageWithProcessing({ onImportComplete, className }: ImportPageWithProcessingProps) {
  const [importState, setImportState] = useState<ImportState>('upload')
  const [uploadedFileId, setUploadedFileId] = useState<Id<'uploaded_files'> | null>(null)
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null)

  // Monitor file status for real-time updates
  const fileStatus = useQuery(
    api.files.getFileStatus,
    uploadedFileId ? { fileId: uploadedFileId } : 'skip'
  )

  // Auto-transition based on file status
  useEffect(() => {
    if (!fileStatus) return

    switch (fileStatus.status) {
      case 'uploaded':
        if (importState === 'upload') {
          setImportState('processing')
          setProcessingStartTime(new Date())
        }
        break
      
      case 'processing':
        if (importState === 'processing') {
          setImportState('monitoring')
        }
        break
      
      case 'completed':
        if (importState === 'monitoring') {
          setImportState('completed')
        }
        break
      
      case 'failed':
        // Stay in monitoring state to show error
        break
    }
  }, [fileStatus, importState])

  const handleUploadStart = () => {
    setImportState('processing')
    setProcessingStartTime(new Date())
  }

  const handleUploadComplete = (fileId: Id<'uploaded_files'>) => {
    setUploadedFileId(fileId)
    // State will be updated by useEffect based on file status
  }

  const handleContinue = () => {
    onImportComplete()
  }

  const getProcessingDuration = () => {
    if (!processingStartTime) return 0
    return Math.floor((Date.now() - processingStartTime.getTime()) / 1000)
  }

  return (
    <main className={`max-w-4xl mx-auto ${className}`} role="main" aria-label="Data import wizard">
      {importState === 'upload' && (
        <section aria-labelledby="upload-heading">
          <FileUploadNew
            onUploadStart={handleUploadStart}
            onUploadComplete={handleUploadComplete}
            className="mb-8"
          />
          
          {/* Show existing files */}
          <FileStatus />
        </section>
      )}

      {importState === 'processing' && (
        <ProcessingScreen
          fileName={fileStatus?.fileName || 'your file'}
          duration={getProcessingDuration()}
          message="We are processing your history"
          subMessage="This may take a few minutes depending on file size"
        />
      )}

      {importState === 'monitoring' && (
        <section aria-labelledby="monitoring-heading">
          <ProcessingScreen
            fileName={fileStatus?.fileName || 'your file'}
            duration={getProcessingDuration()}
            message="Processing in progress"
            subMessage="Extracting video data from your history"
            showProgress={true}
            recordCount={fileStatus?.recordCount}
          />
          
          {/* Show detailed status */}
          <div className="mt-8">
            <FileStatus />
          </div>
        </section>
      )}

      {importState === 'completed' && (
        <section aria-labelledby="completed-heading">
          <div className="text-center py-8 mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 id="completed-heading" className="text-xl font-semibold text-white mb-2">
              Processing Complete!
            </h2>
            <p className="text-gray-400 mb-4">
              Successfully processed {fileStatus?.recordCount?.toLocaleString() || 0} video records
            </p>
            <p className="text-gray-400 mb-6">
              Your data is now ready for analysis. You can continue to the dashboard.
            </p>
            <button
              onClick={handleContinue}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
          
          {/* Show final file status */}
          <FileStatus />
        </section>
      )}
    </main>
  )
}
