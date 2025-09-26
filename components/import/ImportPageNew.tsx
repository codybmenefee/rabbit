'use client'

import { useState } from 'react'
import { FileUploadNew } from './FileUploadNew'
import { FileStatus } from './FileStatus'
import { ImportSummary } from './ImportSummary'
import { ImportSummary as ImportSummaryType } from '@/lib/types'

interface ImportPageNewProps {
  onImportComplete: () => void
  className?: string
}

type ImportState = 'upload' | 'processing' | 'completed'

export function ImportPageNew({ onImportComplete, className }: ImportPageNewProps) {
  const [importState, setImportState] = useState<ImportState>('upload')
  const [uploadedFileId, setUploadedFileId] = useState<string | null>(null)

  const handleUploadStart = () => {
    setImportState('processing')
  }

  const handleUploadComplete = (fileId: string) => {
    setUploadedFileId(fileId)
    setImportState('completed')
  }

  const handleContinue = () => {
    onImportComplete()
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
        <section 
          className="text-center py-12"
          role="status"
          aria-live="polite"
          aria-labelledby="processing-heading"
        >
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4" aria-hidden="true"></div>
          <h2 id="processing-heading" className="text-xl font-semibold text-white mb-2">Uploading File</h2>
          <p className="text-gray-400">
            Your file is being uploaded and will be processed in the background...
          </p>
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
            <h2 id="completed-heading" className="text-xl font-semibold text-white mb-2">File Uploaded Successfully</h2>
            <p className="text-gray-400 mb-6">
              Your file has been uploaded and is being processed in the background. 
              You can continue to the dashboard while processing completes.
            </p>
            <button
              onClick={handleContinue}
              className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
          
          {/* Show file status */}
          <FileStatus />
        </section>
      )}
    </main>
  )
}
