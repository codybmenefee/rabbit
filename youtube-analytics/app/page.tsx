'use client'

import { useState, useEffect } from 'react'
import { Upload, FileText, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImportPage } from '@/components/import/ImportPage'
import { ImportErrorBoundary } from '@/components/import/ErrorBoundary'
import { MainDashboard } from '@/components/dashboard/main-dashboard'
import { watchHistoryStorage } from '@/lib/storage'
import { generateDemoData } from '@/lib/demo-data'
import { WatchRecord } from '@/types/records'

// State management for real data
type AppState = 'empty' | 'import' | 'populated'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('empty')
  const [isLoadingDemo, setIsLoadingDemo] = useState(false)
  const [watchRecords, setWatchRecords] = useState<WatchRecord[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)

  // Check if data exists on mount and load it
  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const hasData = await watchHistoryStorage.hasData()
        
        if (hasData) {
          const records = await watchHistoryStorage.getRecords()
          setWatchRecords(records)
          setAppState('populated')
        }
      } catch (error) {
        console.error('Failed to load existing data:', error)
      } finally {
        setIsLoadingData(false)
      }
    }
    loadExistingData()
  }, [])

  const handleUpload = () => {
    setAppState('import')
  }

  const handleImportComplete = async () => {
    // Reload the data after import
    try {
      const records = await watchHistoryStorage.getRecords()
      setWatchRecords(records)
      setAppState('populated')
    } catch (error) {
      console.error('Failed to load imported data:', error)
    }
  }

  const handleLoadDemo = async () => {
    setIsLoadingDemo(true)
    try {
      const { records, summary } = generateDemoData()
      const metadata = {
        importedAt: new Date().toISOString(),
        fileName: 'demo-data.json',
        fileSize: JSON.stringify(records).length
      }
      
      await watchHistoryStorage.saveRecords(records, metadata, summary)
      setWatchRecords(records)
      setAppState('populated')
    } catch (error) {
      console.error('Failed to load demo data:', error)
    } finally {
      setIsLoadingDemo(false)
    }
  }

  const resetState = async () => {
    await watchHistoryStorage.clearAll()
    setWatchRecords([])
    setAppState('empty')
  }

  const handleNewImport = () => {
    setAppState('import')
  }

  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-terminal-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-signal-green-500 mx-auto mb-4"></div>
          <p className="text-terminal-muted terminal-text">LOADING_DATA_STREAM...</p>
        </div>
      </div>
    )
  }

  if (appState === 'empty') {
    return (
      <div className="min-h-screen bg-terminal-bg">
        <EmptyState onUpload={handleUpload} onLoadDemo={handleLoadDemo} isLoadingDemo={isLoadingDemo} />
      </div>
    )
  }

  if (appState === 'import') {
    return (
      <div className="min-h-screen bg-terminal-bg p-6">
        <ImportErrorBoundary>
          <ImportPage onImportComplete={handleImportComplete} />
        </ImportErrorBoundary>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-terminal-bg">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header with actions */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-terminal-text terminal-text">RABBIT.ANALYTICS</h1>
              <p className="text-terminal-muted text-sm mt-1 terminal-text">
                ANALYZING {watchRecords.length.toLocaleString()} DATA_POINTS
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleNewImport}>
                <Upload className="w-4 h-4 mr-2" />
                IMPORT_NEW_DATA
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-signal-red-400 hover:text-signal-red-300 hover:bg-signal-red-500/10" 
                onClick={resetState}
              >
                <FileText className="w-4 h-4 mr-2" />
                CLEAR_ALL_DATA
              </Button>
            </div>
          </div>

          {/* Main Dashboard */}
          <MainDashboard data={watchRecords} />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ 
  onUpload, 
  onLoadDemo, 
  isLoadingDemo 
}: { 
  onUpload: () => void
  onLoadDemo: () => void
  isLoadingDemo: boolean
}) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-lg terminal-surface border-terminal-border flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 signal-green" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-terminal-text terminal-text">INITIALIZE_DATA_STREAM</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Upload Google Takeout watch history to initialize comprehensive analytics pipeline. Analyze viewing patterns, creator networks, and content trends.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button onClick={onUpload} size="lg" className="w-full">
            <Upload className="w-4 h-4 mr-2" />
INITIALIZE_STREAM
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-400">Or</span>
            </div>
          </div>

          <Button 
            onClick={onLoadDemo} 
            size="lg" 
            variant="outline" 
            className="w-full"
            disabled={isLoadingDemo}
          >
            {isLoadingDemo ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-signal-green-500 mr-2" />
                GENERATING_DEMO_STREAM...
              </>
            ) : (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
LOAD_DEMO_DATA
              </>
            )}
          </Button>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              <span>SUPPORTS_HTML_FORMAT</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>LOCAL_PROCESSING_ONLY</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
