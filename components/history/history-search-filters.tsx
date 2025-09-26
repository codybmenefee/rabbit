'use client'

import { useState } from 'react'
import { Search, Filter, X, Calendar, Tag, Users, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { FilterOptions, TimeframeFilter, Product } from '@/lib/types'

interface HistorySearchFiltersProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  availableTopics: string[]
  availableChannels: string[]
}

export function HistorySearchFilters({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  availableTopics,
  availableChannels
}: HistorySearchFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)

  const timeframeOptions: TimeframeFilter[] = ['All', 'MTD', 'QTD', 'YTD', 'Last6M', 'Last12M']
  const productOptions: Product[] = ['YouTube', 'YouTube Music']

  const hasActiveFilters = filters.timeframe !== 'All' || 
                          filters.product !== 'All' || 
                          (filters.topics && filters.topics.length > 0) ||
                          (filters.channels && filters.channels.length > 0)

  const clearAllFilters = () => {
    onFiltersChange({
      timeframe: 'All',
      product: 'All',
      topics: [],
      channels: []
    })
    onSearchChange('')
  }

  const toggleTopic = (topic: string) => {
    const currentTopics = filters.topics || []
    const newTopics = currentTopics.includes(topic)
      ? currentTopics.filter(t => t !== topic)
      : [...currentTopics, topic]
    
    onFiltersChange({ ...filters, topics: newTopics })
  }

  const toggleChannel = (channel: string) => {
    const currentChannels = filters.channels || []
    const newChannels = currentChannels.includes(channel)
      ? currentChannels.filter(c => c !== channel)
      : [...currentChannels, channel]
    
    onFiltersChange({ ...filters, channels: newChannels })
  }

  const getFilterSummary = () => {
    const parts = []
    
    if (filters.timeframe !== 'All') {
      parts.push(filters.timeframe)
    }
    
    if (filters.product !== 'All') {
      parts.push(filters.product)
    }
    
    if (filters.topics && filters.topics.length > 0) {
      parts.push(`${filters.topics.length} topic${filters.topics.length > 1 ? 's' : ''}`)
    }
    
    if (filters.channels && filters.channels.length > 0) {
      parts.push(`${filters.channels.length} channel${filters.channels.length > 1 ? 's' : ''}`)
    }
    
    return parts.join(' • ')
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search videos, channels, or topics..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={`${
                showFilters || hasActiveFilters
                  ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
                  : 'border-white/[0.08] text-gray-400'
              } whitespace-nowrap`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {hasActiveFilters && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-purple-500/30 rounded">
                  {(filters.topics?.length || 0) + (filters.channels?.length || 0) + 
                   (filters.timeframe !== 'All' ? 1 : 0) + (filters.product !== 'All' ? 1 : 0)}
                </span>
              )}
            </Button>

            {(searchQuery || hasActiveFilters) && (
              <Button
                variant="ghost"
                onClick={clearAllFilters}
                className="text-gray-400 hover:text-white border-white/[0.08]"
              >
                <X className="w-4 h-4 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {/* Active Filter Summary */}
          {(searchQuery || hasActiveFilters) && (
            <div className="mt-3 pt-3 border-t border-white/[0.08]">
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                <span>Active filters:</span>
                {searchQuery && (
                  <span className="px-2 py-1 bg-white/[0.08] rounded">
                    Search: &quot;{searchQuery}&quot;
                  </span>
                )}
                {getFilterSummary() && (
                  <span className="px-2 py-1 bg-white/[0.08] rounded">
                    {getFilterSummary()}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Timeframe Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                  <Calendar className="w-4 h-4" />
                  Time Period
                </label>
                <div className="space-y-2">
                  {timeframeOptions.map(option => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="timeframe"
                        checked={filters.timeframe === option}
                        onChange={() => onFiltersChange({ ...filters, timeframe: option })}
                        className="w-4 h-4 text-purple-500 border-white/[0.08] bg-transparent focus:ring-purple-500/30"
                      />
                      <span className="text-sm text-gray-300">{option}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Product Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                  <Monitor className="w-4 h-4" />
                  Platform
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="product"
                      checked={filters.product === 'All'}
                      onChange={() => onFiltersChange({ ...filters, product: 'All' })}
                      className="w-4 h-4 text-purple-500 border-white/[0.08] bg-transparent focus:ring-purple-500/30"
                    />
                    <span className="text-sm text-gray-300">All Platforms</span>
                  </label>
                  {productOptions.map(product => (
                    <label key={product} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="product"
                        checked={filters.product === product}
                        onChange={() => onFiltersChange({ ...filters, product })}
                        className="w-4 h-4 text-purple-500 border-white/[0.08] bg-transparent focus:ring-purple-500/30"
                      />
                      <span className="text-sm text-gray-300">{product}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Topics Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                  <Tag className="w-4 h-4" />
                  Topics ({filters.topics?.length || 0} selected)
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableTopics.slice(0, 12).map(topic => (
                    <label key={topic} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.topics?.includes(topic) || false}
                        onChange={() => toggleTopic(topic)}
                        className="w-4 h-4 text-purple-500 border-white/[0.08] bg-transparent focus:ring-purple-500/30"
                      />
                      <span className="text-sm text-gray-300">{topic}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Channels Filter */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-white mb-3">
                  <Users className="w-4 h-4" />
                  Channels ({filters.channels?.length || 0} selected)
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {availableChannels.slice(0, 12).map(channel => (
                    <label key={channel} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.channels?.includes(channel) || false}
                        onChange={() => toggleChannel(channel)}
                        className="w-4 h-4 text-purple-500 border-white/[0.08] bg-transparent focus:ring-purple-500/30"
                      />
                      <span className="text-sm text-gray-300 truncate" title={channel}>
                        {channel}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Filter Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-white/[0.08]">
              <div className="text-xs text-gray-400">
                Use filters to narrow down your {availableTopics.length} topics and {availableChannels.length} channels
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(false)}
              >
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}