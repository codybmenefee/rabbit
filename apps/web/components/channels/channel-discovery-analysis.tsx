'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, Calendar, UserPlus, Clock, Zap, BarChart } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart as RechartsBarChart, Bar } from 'recharts'
import { WatchRecord } from '@/types/records'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { format, parseISO, startOfMonth, differenceInMonths, subMonths, isWithinInterval } from 'date-fns'

interface ChannelDiscoveryAnalysisProps {
  data: WatchRecord[]
  className?: string
}

export function ChannelDiscoveryAnalysis({ data, className }: ChannelDiscoveryAnalysisProps) {
  const discoveryAnalysis = useMemo(() => {
    if (data.length === 0) return null

    const now = new Date()
    const thirtyDaysAgo = subMonths(now, 1)
    const sixMonthsAgo = subMonths(now, 6)

    // Track first appearance of each channel
    const channelFirstSeen = new Map<string, Date>()
    const channelLastSeen = new Map<string, Date>()
    const channelVideoCounts = new Map<string, number>()

    data.forEach(record => {
      if (!record.channelTitle || !record.watchedAt) return
      
      const watchDate = parseISO(record.watchedAt)
      const channel = record.channelTitle

      if (!channelFirstSeen.has(channel)) {
        channelFirstSeen.set(channel, watchDate)
      } else {
        const currentFirst = channelFirstSeen.get(channel)!
        if (watchDate < currentFirst) {
          channelFirstSeen.set(channel, watchDate)
        }
      }

      if (!channelLastSeen.has(channel)) {
        channelLastSeen.set(channel, watchDate)
      } else {
        const currentLast = channelLastSeen.get(channel)!
        if (watchDate > currentLast) {
          channelLastSeen.set(channel, watchDate)
        }
      }

      channelVideoCounts.set(channel, (channelVideoCounts.get(channel) || 0) + 1)
    })

    // Calculate discovery metrics
    const newChannels = Array.from(channelFirstSeen.entries())
      .filter(([, firstSeen]) => firstSeen > thirtyDaysAgo)
      .map(([channel]) => channel)

    const recentlyActiveChannels = Array.from(channelLastSeen.entries())
      .filter(([, lastSeen]) => lastSeen > thirtyDaysAgo)
      .map(([channel]) => channel)

    const dormantChannels = Array.from(channelLastSeen.entries())
      .filter(([, lastSeen]) => lastSeen < sixMonthsAgo)
      .map(([channel]) => channel)

    // Monthly discovery trend
    const discoveryByMonth = new Map<string, { new: number, total: number }>()
    
    Array.from(channelFirstSeen.entries()).forEach(([channel, firstSeen]) => {
      const monthKey = format(firstSeen, 'MMM yyyy')
      
      if (!discoveryByMonth.has(monthKey)) {
        discoveryByMonth.set(monthKey, { new: 0, total: 0 })
      }
      
      discoveryByMonth.get(monthKey)!.new++
    })

    // Add total channels per month
    const monthlyTotalChannels = new Map<string, Set<string>>()
    data.forEach(record => {
      if (!record.channelTitle || !record.watchedAt) return
      
      const monthKey = format(parseISO(record.watchedAt), 'MMM yyyy')
      
      if (!monthlyTotalChannels.has(monthKey)) {
        monthlyTotalChannels.set(monthKey, new Set())
      }
      
      monthlyTotalChannels.get(monthKey)!.add(record.channelTitle)
    })

    monthlyTotalChannels.forEach((channels, monthKey) => {
      if (!discoveryByMonth.has(monthKey)) {
        discoveryByMonth.set(monthKey, { new: 0, total: 0 })
      }
      discoveryByMonth.get(monthKey)!.total = channels.size
    })

    const discoveryTrend = Array.from(discoveryByMonth.entries())
      .map(([month, data]) => ({
        month,
        newChannels: data.new,
        totalChannels: data.total,
        discoveryRate: data.total > 0 ? (data.new / data.total) * 100 : 0
      }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
      .slice(-12) // Last 12 months

    // Channel retention analysis
    const retentionData = Array.from(channelFirstSeen.entries()).map(([channel, firstSeen]) => {
      const videoCount = channelVideoCounts.get(channel) || 0
      const monthsSinceDiscovery = Math.max(1, differenceInMonths(now, firstSeen))
      const retentionScore = Math.min(100, (videoCount / monthsSinceDiscovery) * 20)
      
      return {
        channel,
        firstSeen,
        videoCount,
        monthsSinceDiscovery,
        retentionScore,
        isActive: channelLastSeen.get(channel)! > thirtyDaysAgo
      }
    })

    const highRetentionChannels = retentionData
      .filter(c => c.retentionScore >= 60)
      .sort((a, b) => b.retentionScore - a.retentionScore)
      .slice(0, 10)

    const lowRetentionChannels = retentionData
      .filter(c => c.retentionScore < 30 && c.monthsSinceDiscovery >= 3)
      .sort((a, b) => a.retentionScore - b.retentionScore)
      .slice(0, 5)

    return {
      newChannels,
      recentlyActiveChannels,
      dormantChannels,
      discoveryTrend,
      highRetentionChannels,
      lowRetentionChannels,
      totalChannels: channelFirstSeen.size,
      discoveryRate: channelFirstSeen.size > 0 ? (newChannels.length / channelFirstSeen.size) * 100 : 0
    }
  }, [data])

  if (!discoveryAnalysis) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-12 text-gray-400">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No discovery data available</p>
        </div>
      </Card>
    )
  }

  const chartData = discoveryAnalysis.discoveryTrend

  return (
    <Card className={`p-6 bg-black/40 backdrop-blur-xl border-white/5 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-semibold text-white">Discovery & Retention</h2>
      </div>

      <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <UserPlus className="w-6 h-6 text-green-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{discoveryAnalysis.newChannels.length}</div>
            <div className="text-sm text-gray-400">New This Month</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <Zap className="w-6 h-6 text-blue-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{discoveryAnalysis.recentlyActiveChannels.length}</div>
            <div className="text-sm text-gray-400">Recently Active</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{discoveryAnalysis.dormantChannels.length}</div>
            <div className="text-sm text-gray-400">Gone Dormant</div>
          </div>
          
          <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <BarChart className="w-6 h-6 text-purple-400 mx-auto mb-2" />
            <div className="text-2xl font-bold text-white">{discoveryAnalysis.discoveryRate.toFixed(1)}%</div>
            <div className="text-sm text-gray-400">Discovery Rate</div>
          </div>
        </div>

        {/* Discovery Trend Chart */}
        {chartData.length > 1 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Monthly Discovery Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F3F4F6'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newChannels" 
                    stroke="#8B5CF6" 
                    strokeWidth={2}
                    dot={{ fill: '#8B5CF6' }}
                    name="New Channels"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="totalChannels" 
                    stroke="#06B6D4" 
                    strokeWidth={2}
                    dot={{ fill: '#06B6D4' }}
                    name="Total Channels"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* High Retention Channels */}
        {discoveryAnalysis.highRetentionChannels.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              High Retention Channels
            </h3>
            <div className="space-y-2">
              {discoveryAnalysis.highRetentionChannels.map((channel, index) => (
                <motion.div
                  key={channel.channel}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white font-semibold text-xs">
                      {index + 1}
                    </div>
                    <div>
                      <span className="text-white font-medium">{channel.channel}</span>
                      <div className="text-xs text-gray-400">
                        Discovered {format(channel.firstSeen, 'MMM yyyy')} • {channel.videoCount} videos
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      {channel.retentionScore.toFixed(0)}% retention
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* New Channels This Month */}
        {discoveryAnalysis.newChannels.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-purple-400" />
              Recently Discovered
            </h3>
            <div className="flex flex-wrap gap-2">
              {discoveryAnalysis.newChannels.slice(0, 10).map(channel => (
                <Badge key={channel} variant="outline" className="text-purple-400 border-purple-500/30">
                  {channel}
                </Badge>
              ))}
              {discoveryAnalysis.newChannels.length > 10 && (
                <Badge variant="outline" className="text-gray-400">
                  +{discoveryAnalysis.newChannels.length - 10} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Insights */}
        <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
          <h3 className="text-lg font-semibold text-white mb-2">Discovery Insights</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <div>• You have {discoveryAnalysis.totalChannels} total channels in your portfolio</div>
            <div>• {discoveryAnalysis.discoveryRate.toFixed(1)}% of your channels were discovered recently</div>
            <div>• {discoveryAnalysis.highRetentionChannels.length} channels show high retention patterns (60%+ engagement)</div>
            {discoveryAnalysis.dormantChannels.length > 0 && (
              <div>• {discoveryAnalysis.dormantChannels.length} channels have gone dormant (no activity in 6+ months)</div>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}