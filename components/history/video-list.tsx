'use client'

import { useState, useMemo } from 'react'
import { format, parseISO, isValid } from 'date-fns'
import { Play, ExternalLink, CheckSquare, Square, User, Calendar } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { WatchRecord } from '@/lib/types'

interface VideoListProps {
  records: WatchRecord[]
  selectedRecords: Set<string>
  onSelectionChange: (selected: Set<string>) => void
}

type SortField = 'watchedAt' | 'videoTitle' | 'channelTitle' | 'product'
type SortOrder = 'asc' | 'desc'

export function VideoList({ records, selectedRecords, onSelectionChange }: VideoListProps) {
  const [sortField, setSortField] = useState<SortField>('watchedAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)

  // Sort and paginate records
  const sortedRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const aVal = a[sortField]
      const bVal = b[sortField]

      // Handle null values
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      // Convert to string for consistent comparison
      const aStr = String(aVal).toLowerCase()
      const bStr = String(bVal).toLowerCase()

      return sortOrder === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })

    return sorted
  }, [records, sortField, sortOrder])

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return sortedRecords.slice(startIndex, startIndex + itemsPerPage)
  }, [sortedRecords, currentPage, itemsPerPage])

  const totalPages = Math.ceil(sortedRecords.length / itemsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  const handleSelectAll = () => {
    if (selectedRecords.size === paginatedRecords.length) {
      // Deselect all on current page
      const newSelection = new Set(selectedRecords)
      paginatedRecords.forEach(record => newSelection.delete(record.id))
      onSelectionChange(newSelection)
    } else {
      // Select all on current page
      const newSelection = new Set(selectedRecords)
      paginatedRecords.forEach(record => newSelection.add(record.id))
      onSelectionChange(newSelection)
    }
  }

  const handleSelectRecord = (recordId: string) => {
    const newSelection = new Set(selectedRecords)
    if (newSelection.has(recordId)) {
      newSelection.delete(recordId)
    } else {
      newSelection.add(recordId)
    }
    onSelectionChange(newSelection)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Unknown date'
    const date = parseISO(dateString)
    return isValid(date) ? format(date, 'MMM dd, yyyy HH:mm') : 'Invalid date'
  }

  const getTopicColor = (topic: string) => {
    const colors = {
      'Technology': 'bg-blue-500/20 text-blue-300',
      'Finance': 'bg-green-500/20 text-green-300',
      'Entertainment': 'bg-pink-500/20 text-pink-300',
      'Education': 'bg-yellow-500/20 text-yellow-300',
      'Gaming': 'bg-purple-500/20 text-purple-300',
      'Music': 'bg-red-500/20 text-red-300',
      'News': 'bg-gray-500/20 text-gray-300',
      'Sports': 'bg-orange-500/20 text-orange-300',
      'Science': 'bg-cyan-500/20 text-cyan-300',
    }
    return colors[topic as keyof typeof colors] || 'bg-gray-500/20 text-gray-300'
  }

  if (records.length === 0) {
    return (
      <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
        <CardContent className="p-8 text-center">
          <Play className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No videos found</h3>
          <p className="text-gray-400">
            Try adjusting your search terms or filters to find more videos.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="text-gray-400 hover:text-white"
              >
                {selectedRecords.size === paginatedRecords.length ? (
                  <CheckSquare className="w-4 h-4 mr-2" />
                ) : (
                  <Square className="w-4 h-4 mr-2" />
                )}
                {selectedRecords.size > 0 ? `${selectedRecords.size} selected` : 'Select all'}
              </Button>

              <div className="text-sm text-gray-400">
                {sortedRecords.length} video{sortedRecords.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Sort by:</span>
              {[
                { key: 'watchedAt', label: 'Date' },
                { key: 'videoTitle', label: 'Title' },
                { key: 'channelTitle', label: 'Channel' },
                { key: 'product', label: 'Platform' }
              ].map(({ key, label }) => (
                <Button
                  key={key}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort(key as SortField)}
                  className={`text-xs ${
                    sortField === key 
                      ? 'text-purple-300 bg-purple-500/20' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {label}
                  {sortField === key && (
                    <span className="ml-1">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Video List */}
      <div className="space-y-2">
        {paginatedRecords.map((record) => (
          <Card 
            key={record.id}
            className={`border-white/[0.08] bg-black/40 backdrop-blur-xl transition-all hover:bg-black/60 ${
              selectedRecords.has(record.id) ? 'ring-1 ring-purple-500/50 bg-purple-500/5' : ''
            }`}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                {/* Selection Checkbox */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectRecord(record.id)}
                  className="mt-1 p-0 h-auto hover:bg-transparent"
                >
                  {selectedRecords.has(record.id) ? (
                    <CheckSquare className="w-4 h-4 text-purple-400" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400 hover:text-white" />
                  )}
                </Button>

                {/* Video Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white line-clamp-2 mb-1">
                        {record.videoTitle || 'Untitled Video'}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400 mb-2">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {record.channelTitle || 'Unknown Channel'}
                        </span>
                        
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(record.watchedAt)}
                        </span>

                        <Badge 
                          variant="outline" 
                          className={`text-xs px-2 py-0.5 ${
                            record.product === 'YouTube Music' 
                              ? 'border-red-500/30 text-red-300' 
                              : 'border-white/[0.08] text-gray-400'
                          }`}
                        >
                          {record.product}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {record.videoUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(record.videoUrl!, '_blank')}
                          className="text-gray-400 hover:text-white p-2 h-auto"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Topics */}
                  {record.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {record.topics.slice(0, 4).map((topic) => (
                        <Badge
                          key={topic}
                          variant="outline"
                          className={`text-xs px-2 py-0.5 ${getTopicColor(topic)}`}
                        >
                          {topic}
                        </Badge>
                      ))}
                      {record.topics.length > 4 && (
                        <Badge variant="outline" className="text-xs px-2 py-0.5 text-gray-400">
                          +{record.topics.length - 4} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, sortedRecords.length)} of {sortedRecords.length} videos
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                    return (
                      <Button
                        key={pageNum}
                        variant={pageNum === currentPage ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 p-0 text-xs ${
                          pageNum === currentPage 
                            ? 'bg-purple-500 text-white' 
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}