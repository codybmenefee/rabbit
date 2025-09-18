'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, TrendingUp, Clock, BarChart3, Search, Filter, SortAsc } from 'lucide-react'
import { WatchRecord } from '@/types/records'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

import { ChannelPortfolioView } from '@/components/channels/channel-portfolio-view'
import { ChannelRelationshipAnalysis } from '@/components/channels/channel-relationship-analysis'
import { ChannelDiscoveryAnalysis } from '@/components/channels/channel-discovery-analysis'

export default function ChannelsPage() {
  const [data, setData] = useState<WatchRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'videos' | 'recent'>('videos')

  const records = useQuery(api.dashboard.records, {}) as WatchRecord[] | undefined
  useEffect(() => {
    if (records !== undefined) {
      setData(records ?? [])
      setIsLoading(false)
    }
  }, [records])

  // Basic channel metrics calculation
  const channelMetrics = useMemo(() => {
    const channelMap = new Map<string, {
      name: string
      videoCount: number
      firstSeen: Date
      lastSeen: Date
      topics: Set<string>
    }>()

    data.forEach(record => {
      if (!record.channelTitle || !record.watchedAt) return
      
      const channelName = record.channelTitle
      const watchDate = new Date(record.watchedAt)

      if (!channelMap.has(channelName)) {
        channelMap.set(channelName, {
          name: channelName,
          videoCount: 0,
          firstSeen: watchDate,
          lastSeen: watchDate,
          topics: new Set()
        })
      }

      const channel = channelMap.get(channelName)!
      channel.videoCount++
      
      if (watchDate < channel.firstSeen) channel.firstSeen = watchDate
      if (watchDate > channel.lastSeen) channel.lastSeen = watchDate
      
      record.topics.forEach(topic => channel.topics.add(topic))
    })

    return Array.from(channelMap.values())
  }, [data])

  const filteredChannels = useMemo(() => {
    let filtered = channelMetrics.filter(channel =>
      channel.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Sort channels
    switch (sortBy) {
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'videos':
        filtered.sort((a, b) => b.videoCount - a.videoCount)
        break
      case 'recent':
        filtered.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())
        break
    }

    return filtered
  }, [channelMetrics, searchQuery, sortBy])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading channel data...</p>
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-white mb-2">No Channel Data</h2>
          <p className="text-gray-400">Upload your YouTube watch history to analyze your channel relationships</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-400" />
                <div>
                  <h1 className="text-3xl font-bold text-white">Channel Analysis</h1>
                  <p className="text-gray-400">Deep dive into your creator relationships and viewing patterns</p>
                </div>
              </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Channels</p>
                    <p className="text-2xl font-bold text-white">{channelMetrics.length}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Videos</p>
                    <p className="text-2xl font-bold text-white">{data.length}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-purple-400" />
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Avg Videos/Channel</p>
                    <p className="text-2xl font-bold text-white">
                      {Math.round(data.length / (channelMetrics.length || 1))}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-purple-400" />
                </div>
              </Card>
              
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Active Channels</p>
                    <p className="text-2xl font-bold text-white">
                      {channelMetrics.filter(c => 
                        (Date.now() - c.lastSeen.getTime()) < (30 * 24 * 60 * 60 * 1000)
                      ).length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-400" />
                </div>
              </Card>
            </div>

            {/* Search and Filters */}
            <div className="flex gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search channels..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={sortBy === 'videos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('videos')}
                >
                  <SortAsc className="w-4 h-4 mr-2" />
                  Videos
                </Button>
                <Button
                  variant={sortBy === 'name' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('name')}
                >
                  Name
                </Button>
                <Button
                  variant={sortBy === 'recent' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSortBy('recent')}
                >
                  Recent
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="space-y-6">
            {/* Channel Portfolio View */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <ChannelPortfolioView data={data} />
            </motion.div>

            {/* Analysis Components Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <ChannelRelationshipAnalysis data={data} />
              </motion.div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <ChannelDiscoveryAnalysis data={data} />
              </motion.div>
            </div>

            {/* Channel List Preview */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Top Channels ({filteredChannels.length})
                </h3>
                <div className="space-y-3">
                  {filteredChannels.slice(0, 10).map((channel, index) => (
                    <div
                      key={channel.name}
                      className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-white font-medium">{channel.name}</p>
                          <p className="text-sm text-gray-400">
                            {channel.videoCount} videos • {channel.topics.size} topics
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Last watched</p>
                        <p className="text-sm text-white">
                          {channel.lastSeen.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
