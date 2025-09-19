'use client'

import { useState, useEffect } from 'react'

// Configure caching for user data pages
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Upload, FileText, Search } from 'lucide-react'
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-l-cyan-400 border-t-purple-400"></div>
          <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Loading dashboard</p>
          <p className="text-sm text-slate-400">Preparing your personalized analytics...</p>
        </div>
      </div>
    )
  }

  if (appState === 'empty') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <EmptyState onUpload={handleUpload} />
      </div>
    )
  }

  if (appState === 'import') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 p-6 text-slate-100">
        <ImportErrorBoundary>
          <ImportPage onImportComplete={handleImportComplete} />
        </ImportErrorBoundary>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-cyan-400 text-sm font-semibold uppercase">
              rb
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Overview</p>
              <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <input
                type="search"
                placeholder="Find anything..."
                className="h-10 w-72 rounded-full border border-white/10 bg-white/5 px-4 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-purple-500/60 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            <Button
              onClick={handleNewImport}
              className="bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/20"
            >
              <Upload className="mr-2 h-4 w-4" />
              New upload
            </Button>
          </div>
        </header>

        <DashboardDataProvider className="space-y-8" onRequestImport={handleNewImport} />
      </div>
      <ConvexClerkHealthBanner />
    </div>
  )
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-slate-100 shadow-2xl shadow-purple-500/10 backdrop-blur">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-cyan-400/90 text-white">
          <Upload className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">Start your report</h2>
          <p className="text-sm text-slate-300">
            Upload your Google Takeout watch history to unlock watchtime, topic, and productivity insights tailored to your habits.
          </p>
        </div>
        <Button
          onClick={onUpload}
          size="lg"
          className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 text-white shadow-lg shadow-purple-500/20"
        >
          <Upload className="mr-2 h-4 w-4" /> Upload data
        </Button>
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <FileText className="h-3 w-3" />
          <span>Supports Google Takeout HTML exports</span>
        </div>
      </div>
    </div>
  )
}
