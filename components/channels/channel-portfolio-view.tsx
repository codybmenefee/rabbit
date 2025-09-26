'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { 
  Users, 
  TrendingUp, 
  Clock, 
  Calendar, 
  Target,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Star,
  Activity
} from 'lucide-react'
import { WatchRecord, EnhancedChannelMetrics } from '@/lib/types'
import { computeEnhancedChannelMetrics } from '@/lib/channel-aggregations'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ChannelPortfolioViewProps {
  data: WatchRecord[]
  className?: string
}

type SortField = 'videos' | 'loyalty' | 'recent' | 'name' | 'topics'
type SortDirection = 'asc' | 'desc'

export function ChannelPortfolioView({ data, className }: ChannelPortfolioViewProps) {
  const [sortField, setSortField] = useState<SortField>('videos')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set())

  const enhancedChannels = useMemo(() => {
    const channels = computeEnhancedChannelMetrics(data)
    
    // Sort channels
    return channels.sort((a, b) => {
      let aValue, bValue
      
      switch (sortField) {
        case 'videos':
          aValue = a.videoCount
          bValue = b.videoCount
          break
        case 'loyalty':
          aValue = a.loyaltyScore
          bValue = b.loyaltyScore
          break
        case 'recent':
          aValue = a.lastWatched.getTime()
          bValue = b.lastWatched.getTime()
          break
        case 'name':
          aValue = a.channelTitle.toLowerCase()
          bValue = b.channelTitle.toLowerCase()
          break
        case 'topics':
          aValue = a.topicsSpread.length
          bValue = b.topicsSpread.length
          break
        default:
          return 0
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }
      
      const numA = aValue as number
      const numB = bValue as number
      return sortDirection === 'asc' ? numA - numB : numB - numA
    })
  }, [data, sortField, sortDirection])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const toggleDetails = (channelTitle: string) => {
    const newShowDetails = new Set(showDetails)
    if (newShowDetails.has(channelTitle)) {
      newShowDetails.delete(channelTitle)
    } else {
      newShowDetails.add(channelTitle)
    }
    setShowDetails(newShowDetails)
  }

  const getLoyaltyBadge = (score: number) => {
    if (score >= 80) return { text: 'Highly Loyal', variant: 'default' as const, color: 'text-green-400' }
    if (score >= 60) return { text: 'Loyal', variant: 'secondary' as const, color: 'text-blue-400' }
    if (score >= 40) return { text: 'Regular', variant: 'outline' as const, color: 'text-yellow-400' }
    return { text: 'Casual', variant: 'outline' as const, color: 'text-gray-400' }
  }

  const SortButton = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleSort(field)}
      className="flex items-center gap-1 text-gray-300 hover:text-white"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      )}
    </Button>
  )

  return (
    <Card className={`p-6 bg-black/40 backdrop-blur-xl border-white/5 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-purple-400" />
          <h2 className="text-xl font-semibold text-white">Channel Portfolio</h2>
          <Badge variant="outline">{enhancedChannels.length} channels</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-black/20 rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="text-xs"
            >
              List
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="text-xs"
            >
              Grid
            </Button>
          </div>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-white/10">
        <span className="text-sm text-gray-400 mr-2">Sort by:</span>
        <SortButton field="videos">Videos</SortButton>
        <SortButton field="loyalty">Loyalty</SortButton>
        <SortButton field="recent">Recent</SortButton>
        <SortButton field="name">Name</SortButton>
        <SortButton field="topics">Topics</SortButton>
      </div>

      {viewMode === 'list' ? (
        <div className="space-y-3">
          {enhancedChannels.map((channel, index) => {
            const loyaltyBadge = getLoyaltyBadge(channel.loyaltyScore)
            const isExpanded = showDetails.has(channel.channelTitle)
            
            return (
              <motion.div
                key={channel.channelTitle}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <div className="p-4 rounded-lg bg-black/20 border border-white/10 hover:border-white/20 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Rank */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                        {index + 1}
                      </div>

                      {/* Channel Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {channel.channelTitle}
                          </h3>
                          {channel.discoveryMetrics.isNew && (
                            <Badge variant="outline" className="text-xs bg-green-500/10 text-green-400 border-green-500/30">
                              New
                            </Badge>
                          )}
                          {channel.channelUrl && (
                            <a
                              href={channel.channelUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Activity className="w-3 h-3" />
                            {channel.videoCount} videos
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3" />
                            {channel.topicsSpread.length} topics
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {channel.lastWatched.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <Badge className={loyaltyBadge.color}>{loyaltyBadge.text}</Badge>
                        <p className="text-xs text-gray-400 mt-1">
                          {channel.loyaltyScore}/100 loyalty
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDetails(channel.channelTitle)}
                        className="text-gray-400 hover:text-white"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 pt-4 border-t border-white/10"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Viewing Pattern */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Viewing Pattern</h4>
                          <div className="space-y-1 text-xs text-gray-400">
                            <div>Peak Hour: {channel.viewingPattern.peakHour}:00</div>
                            <div>Peak Day: {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][channel.viewingPattern.peakDay]}</div>
                            <div>Consistency: {channel.viewingPattern.consistencyScore}%</div>
                          </div>
                        </div>

                        {/* Discovery Metrics */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Discovery</h4>
                          <div className="space-y-1 text-xs text-gray-400">
                            <div>First Watched: {channel.firstWatched.toLocaleDateString()}</div>
                            <div>Retention Rate: {(channel.discoveryMetrics.retentionRate * 100).toFixed(1)}%</div>
                            <div>Session Frequency: {(channel.discoveryMetrics.sessionFrequency * 100).toFixed(1)}%</div>
                          </div>
                        </div>

                        {/* Topics */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Topics</h4>
                          <div className="flex flex-wrap gap-1">
                            {channel.topicsSpread.slice(0, 5).map(topic => (
                              <Badge key={topic} variant="outline" className="text-xs">
                                {topic}
                              </Badge>
                            ))}
                            {channel.topicsSpread.length > 5 && (
                              <Badge variant="outline" className="text-xs">
                                +{channel.topicsSpread.length - 5} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        // Grid View
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enhancedChannels.map((channel, index) => {
            const loyaltyBadge = getLoyaltyBadge(channel.loyaltyScore)
            
            return (
              <motion.div
                key={channel.channelTitle}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-4 h-full hover:border-purple-500/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                      {index + 1}
                    </div>
                    <Badge className={loyaltyBadge.color}>{loyaltyBadge.text}</Badge>
                  </div>
                  
                  <h3 className="font-semibold text-white mb-2 line-clamp-2">
                    {channel.channelTitle}
                  </h3>
                  
                  <div className="space-y-2 text-sm text-gray-400 mb-4">
                    <div className="flex items-center justify-between">
                      <span>Videos:</span>
                      <span className="text-white font-medium">{channel.videoCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Topics:</span>
                      <span className="text-white font-medium">{channel.topicsSpread.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Loyalty:</span>
                      <span className="text-white font-medium">{channel.loyaltyScore}/100</span>
                    </div>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Last watched: {channel.lastWatched.toLocaleDateString()}
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      {enhancedChannels.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No channels found matching your criteria</p>
        </div>
      )}
    </Card>
  )
}