'use client'

import { useState } from 'react'
import { ImportSummary as ImportSummaryType } from '@/lib/types'
import { FileUpload } from './FileUpload'
import { ImportSummary } from './ImportSummary'

interface ImportPageProps {
  onImportComplete: () => void
  className?: string
}

type ImportState = 'upload' | 'processing' | 'summary'

export function ImportPage({ onImportComplete, className }: ImportPageProps) {
  const [importState, setImportState] = useState<ImportState>('upload')
  const [summary, setSummary] = useState<ImportSummaryType | null>(null)

  const handleImportStart = () => {
    setImportState('processing')
  }

  const handleImportComplete = (importSummary: ImportSummaryType) => {
    setSummary(importSummary)
    setImportState('summary')
  }

  const handleContinue = () => {
    onImportComplete()
  }

  return (
    <main className={`max-w-2xl mx-auto ${className}`} role="main" aria-label="Data import wizard">
      {importState === 'upload' && (
        <section aria-labelledby="upload-heading">
          <FileUpload
            onImportStart={handleImportStart}
            onImportComplete={handleImportComplete}
          />
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
          <h2 id="processing-heading" className="text-xl font-semibold text-white mb-2">Processing Your Data</h2>
          <p className="text-gray-400">
            Parsing and normalizing your YouTube watch history...
          </p>
        </section>
      )}

      {importState === 'summary' && summary && (
        <section aria-labelledby="summary-heading">
          <ImportSummary
            summary={summary}
            onContinue={handleContinue}
          />
        </section>
      )}
    </main>
  )
}