'use client'

import { useState, useEffect } from 'react'

// Configure caching for user data pages
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Upload, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImportPage } from '@/components/import/ImportPage'
import { ImportErrorBoundary } from '@/components/import/ErrorBoundary'
import { DashboardDataProvider } from '@/components/dashboard/dashboard-data-provider'
import { ConvexClerkHealthBanner } from '@/components/dev/convex-clerk-health'

// State management for real data
type AppState = 'empty' | 'import' | 'populated'

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth()
  const [appState, setAppState] = useState<AppState>('empty')
  const [isLoadingData, setIsLoadingData] = useState(true)
  const dashboardStatus = useQuery(api.dashboard.status, isSignedIn ? {} : 'skip')

  // DashboardDataProvider will load from Convex; keep local state until import completes
  useEffect(() => {
    if (!isLoaded) {
      return
    }

    if (appState === 'import') {
      setIsLoadingData(false)
      return
    }

    if (!isSignedIn) {
      setIsLoadingData(false)
      setAppState('empty')
      return
    }

    if (dashboardStatus === undefined) {
      setIsLoadingData(true)
      return
    }

    setIsLoadingData(false)

    if (dashboardStatus?.hasData) {
      setAppState('populated')
    } else if (appState !== 'import') {
      setAppState('empty')
    }
  }, [isLoaded, isSignedIn, dashboardStatus, appState])

  const handleUpload = () => {
    setAppState('import')
  }

  const handleImportComplete = async () => {
    // Just transition to populated state
    // DashboardDataProvider will handle data loading
    setAppState('populated')
  }

  // Demo/local caching removed in Convex-only mode

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
        <EmptyState onUpload={handleUpload} />
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
                INTELLIGENT_YOUTUBE_ANALYTICS_PLATFORM
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleNewImport}>
                <Upload className="w-4 h-4 mr-2" />
                IMPORT_NEW_DATA
              </Button>
            </div>
          </div>

          {/* Main Dashboard with Data Provider */}
          <DashboardDataProvider />
          <ConvexClerkHealthBanner />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
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
          <div className="flex items-center gap-4 text-xs text-gray-500 justify-center">
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              <span>SUPPORTS_HTML_FORMAT</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
