'use client'

import { useState, useEffect } from 'react'
import { Upload, FileText, BarChart3, TrendingUp, Users, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChartContainer } from '@/components/ui/chart-container'
import { ImportPage } from '@/components/import/ImportPage'
import { ImportErrorBoundary } from '@/components/import/ErrorBoundary'
import { watchHistoryStorage } from '@/lib/storage'

// State management for real data
type AppState = 'empty' | 'import' | 'populated'

export default function Home() {
  const [appState, setAppState] = useState<AppState>('empty')

  // Check if data exists on mount
  useEffect(() => {
    const checkExistingData = async () => {
      const hasData = await watchHistoryStorage.hasData()
      if (hasData) {
        setAppState('populated')
      }
    }
    checkExistingData()
  }, [])

  const handleUpload = () => {
    setAppState('import')
  }

  const handleImportComplete = () => {
    setAppState('populated')
  }

  const resetState = async () => {
    await watchHistoryStorage.clearAll()
    setAppState('empty')
  }

  if (appState === 'empty') {
    return <EmptyState onUpload={handleUpload} />
  }

  if (appState === 'import') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 p-6">
        <ImportErrorBoundary>
          <ImportPage onImportComplete={handleImportComplete} />
        </ImportErrorBoundary>
      </div>
    )
  }

  return <PopulatedState onReset={resetState} />
}

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        <div className="space-y-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mx-auto">
            <Upload className="w-8 h-8 text-purple-400" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-white">Import Your YouTube Data</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Upload your Google Takeout watch history to unlock powerful insights about your YouTube viewing patterns, favorite creators, and content trends.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Button onClick={onUpload} size="lg" className="w-full">
            <Upload className="w-4 h-4 mr-2" />
            Upload Watch History
          </Button>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3" />
              <span>Supports .html & .zip files</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>Local processing only</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


function PopulatedState({ onReset }: { onReset: () => void }) {
  return (
    <div className="p-6 space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Videos Watched (YTD)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-white">1,247</div>
            <div className="flex items-center text-sm text-emerald-400 mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +23.1% vs last year
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Unique Channels
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-white">89</div>
            <div className="flex items-center text-sm text-red-400 mt-1">
              <ArrowDownRight className="w-3 h-3 mr-1" />
              -5.2% vs last year
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Avg. Daily Videos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-white">12.4</div>
            <div className="flex items-center text-sm text-emerald-400 mt-1">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              +8.7% vs last year
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Top Category
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-lg font-semibold text-white">Technology</div>
            <div className="text-sm text-gray-400 mt-1">34% of total views</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer 
          title="Monthly Viewing Trend"
          subtitle="Videos watched per month"
        >
          <div className="h-80 flex items-center justify-center text-gray-400">
            Chart placeholder - Monthly trend line chart
          </div>
        </ChartContainer>

        <ChartContainer 
          title="Top Channels"
          subtitle="Most watched creators this year"
        >
          <div className="h-80 flex items-center justify-center text-gray-400">
            Chart placeholder - Horizontal bar chart
          </div>
        </ChartContainer>
      </div>

      {/* Topics and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-white">Content Topics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge>Technology</Badge>
              <Badge variant="secondary">Education</Badge>
              <Badge variant="secondary">Gaming</Badge>
              <Badge variant="secondary">Music</Badge>
              <Badge variant="secondary">Science</Badge>
              <Badge variant="secondary">Programming</Badge>
              <Badge variant="secondary">AI & ML</Badge>
              <Badge variant="secondary">Design</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-white">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" size="sm" className="w-full justify-start">
              <Upload className="w-4 h-4 mr-2" />
              Import New Data
            </Button>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onReset}>
              <FileText className="w-4 h-4 mr-2" />
              Clear All Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}