'use client'

import { motion } from 'framer-motion'
import { Filter, Calendar, Play, Tag } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TimeframeFilter, Product, FilterOptions } from '@/types/records'

interface DashboardFiltersProps {
  filters: FilterOptions
  onFiltersChange: (filters: FilterOptions) => void
  availableTopics?: string[]
  availableChannels?: string[]
}

const timeframeOptions: { value: TimeframeFilter; label: string }[] = [
  { value: 'MTD', label: 'Month to Date' },
  { value: 'QTD', label: 'Quarter to Date' },
  { value: 'YTD', label: 'Year to Date' },
  { value: 'Last6M', label: 'Last 6 Months' },
  { value: 'Last12M', label: 'Last 12 Months' },
  { value: 'All', label: 'All Time' }
]

const productOptions: { value: Product; label: string }[] = [
  { value: 'All', label: 'All Products' },
  { value: 'YouTube', label: 'YouTube' },
  { value: 'YouTube Music', label: 'YouTube Music' }
]

export function DashboardFilters({ 
  filters, 
  onFiltersChange,
  availableTopics = [],
  availableChannels = []
}: DashboardFiltersProps) {
  const updateFilter = (key: keyof FilterOptions, value: TimeframeFilter | Product | string[] | undefined) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  const toggleTopic = (topic: string) => {
    const currentTopics = filters.topics || []
    const newTopics = currentTopics.includes(topic)
      ? currentTopics.filter(t => t !== topic)
      : [...currentTopics, topic]
    
    updateFilter('topics', newTopics)
  }

  const clearAllFilters = () => {
    onFiltersChange({
      timeframe: 'All',
      product: 'All',
      topics: [],
      channels: []
    })
  }

  const hasActiveFilters = 
    filters.timeframe !== 'All' || 
    filters.product !== 'All' || 
    (filters.topics && filters.topics.length > 0) ||
    (filters.channels && filters.channels.length > 0)

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            {/* Filter Icon and Title */}
            <div className="flex items-center gap-2 text-white font-medium">
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 flex-1">
              {/* Timeframe Filter */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {timeframeOptions.map(option => (
                    <Button
                      key={option.value}
                      variant={filters.timeframe === option.value ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => updateFilter('timeframe', option.value)}
                      className="text-xs h-7 px-2"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Product Filter */}
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {productOptions.map(option => (
                    <Button
                      key={option.value}
                      variant={filters.product === option.value ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => updateFilter('product', option.value)}
                      className="text-xs h-7 px-2"
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                className="text-xs h-7"
              >
                Clear All
              </Button>
            )}
          </div>

          {/* Topic Filters */}
          {availableTopics.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-white font-medium">Topics</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTopics.slice(0, 12).map(topic => {
                  const isSelected = filters.topics?.includes(topic) || false
                  return (
                    <Badge
                      key={topic}
                      variant={isSelected ? 'default' : 'secondary'}
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => toggleTopic(topic)}
                    >
                      {topic}
                      {isSelected && (
                        <span className="ml-1 text-xs">×</span>
                      )}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex flex-wrap gap-2 items-center text-sm">
                <span className="text-muted-foreground">Active filters:</span>
                
                {filters.timeframe !== 'All' && (
                  <Badge variant="outline" className="text-xs">
                    {timeframeOptions.find(opt => opt.value === filters.timeframe)?.label}
                  </Badge>
                )}
                
                {filters.product !== 'All' && (
                  <Badge variant="outline" className="text-xs">
                    {filters.product}
                  </Badge>
                )}
                
                {filters.topics && filters.topics.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {filters.topics.length} topic{filters.topics.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}