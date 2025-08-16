'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { WatchRecord } from '@/types/records'
import { watchHistoryStorage } from '@/lib/storage'
import { createHistoricalStorage } from '@/lib/historical-storage'
import { Card } from '@/components/ui/card'
import { Loader2, Calendar, Clock, Film, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { format, parseISO } from 'date-fns'

const ITEMS_PER_PAGE = 100

export default function HistoryPage() {
  const { data: session, status } = useSession()
  const [records, setRecords] = useState<WatchRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  
  const isAuthenticated = status === 'authenticated' && session?.user?.id

  // Load data from storage
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      let allRecords: WatchRecord[] = []
      
      if (isAuthenticated && session?.user?.id) {
        // Try historical storage first for authenticated users
        const historicalStorage = createHistoricalStorage(session.user.id)
        const aggregations = await historicalStorage.getPrecomputedAggregations()
        
        if (aggregations && aggregations.totalRecords > 0) {
          allRecords = await historicalStorage.queryTimeSlice({})
        } else {
          // Fall back to session storage
          allRecords = await watchHistoryStorage.getRecords()
        }
      } else {
        // Use session storage for unauthenticated users
        allRecords = await watchHistoryStorage.getRecords()
      }

      // Filter out records without timestamps and sort by date (newest first)
      const validRecords = allRecords
        .filter(r => r.watchedAt !== null)
        .sort((a, b) => {
          const dateA = new Date(a.watchedAt!).getTime()
          const dateB = new Date(b.watchedAt!).getTime()
          return dateB - dateA // Newest first
        })

      setRecords(validRecords)
      setTotalRecords(validRecords.length)
    } catch (error) {
      console.error('Failed to load history data:', error)
      setRecords([])
      setTotalRecords(0)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, session?.user?.id])

  // Load data on mount and when auth status changes
  useEffect(() => {
    if (status !== 'loading') {
      loadData()
    }
  }, [status, loadData])

  // Calculate pagination
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentRecords = records.slice(startIndex, endIndex)

  // Handle page navigation
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
      // Scroll to top of the list
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Format date for display
  const formatWatchDate = (dateStr: string) => {
    try {
      const date = parseISO(dateStr)
      return format(date, 'MMM d, yyyy • h:mm a')
    } catch {
      return 'Unknown date'
    }
  }

  // Get page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 7
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push('...')
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push('...')
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i)
        }
        pages.push('...')
        pages.push(totalPages)
      }
    }
    
    return pages
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
          <p className="text-gray-400">Loading watch history...</p>
        </div>
      </div>
    )
  }

  if (records.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="p-8 text-center max-w-md">
          <Film className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Watch History</h3>
          <p className="text-gray-400">
            Upload your YouTube watch history to see your viewing timeline.
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Watch History</h1>
          <p className="text-gray-400 mt-1">
            {totalRecords.toLocaleString()} videos watched
          </p>
        </div>
        
        {/* Page info */}
        <div className="text-sm text-gray-400">
          Showing {startIndex + 1}-{Math.min(endIndex, totalRecords)} of {totalRecords.toLocaleString()}
        </div>
      </div>

      {/* Video List */}
      <Card className="divide-y divide-gray-800">
        {currentRecords.map((record) => (
          <div key={record.id} className="p-4 hover:bg-white/[0.02] transition-colors">
            <div className="flex items-start gap-4">
              {/* Date/Time Column */}
              <div className="flex-shrink-0 w-40 text-sm text-gray-400">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatWatchDate(record.watchedAt!)}</span>
                </div>
              </div>

              {/* Video Info */}
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium truncate">
                  {record.videoTitle || 'Untitled Video'}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                  {record.channelTitle && (
                    <span className="truncate">{record.channelTitle}</span>
                  )}
                  {record.product && (
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      record.product === 'YouTube Music' 
                        ? 'bg-pink-500/10 text-pink-400 border border-pink-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {record.product === 'YouTube Music' ? 'Music' : 'Video'}
                    </span>
                  )}
                  {record.topics && record.topics.length > 0 && (
                    <div className="flex gap-1">
                      {record.topics.slice(0, 2).map((topic, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 text-xs">
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Link to YouTube */}
              {record.videoUrl && (
                <a
                  href={record.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 p-2 rounded hover:bg-white/[0.06] transition-colors"
                  aria-label="Open in YouTube"
                >
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </a>
              )}
            </div>
          </div>
        ))}
      </Card>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {/* Previous Button */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 rounded-lg hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4 text-gray-400" />
          </button>

          {/* Page Numbers */}
          <div className="flex items-center gap-1">
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
                  ...
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => goToPage(page as number)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    currentPage === page
                      ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                  }`}
                  aria-label={`Go to page ${page}`}
                  aria-current={currentPage === page ? 'page' : undefined}
                >
                  {page}
                </button>
              )
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 rounded-lg hover:bg-white/[0.06] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        </div>
      )}
    </div>
  )
}