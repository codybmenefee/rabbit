'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart3, Users, Link, TrendingUp, Target } from 'lucide-react'
import { WatchRecord, ChannelRelationship } from '@/lib/types'
import { computeChannelRelationships } from '@/lib/channel-aggregations'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ChannelRelationshipAnalysisProps {
  data: WatchRecord[]
  className?: string
}

export function ChannelRelationshipAnalysis({ data, className }: ChannelRelationshipAnalysisProps) {
  const relationships = useMemo(() => {
    return computeChannelRelationships(data)
  }, [data])

  const getRelationshipStrength = (score: number) => {
    if (score >= 70) return { text: 'Very Strong', color: 'text-green-400', bgColor: 'bg-green-500/10 border-green-500/30' }
    if (score >= 50) return { text: 'Strong', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/30' }
    if (score >= 30) return { text: 'Moderate', color: 'text-yellow-400', bgColor: 'bg-yellow-500/10 border-yellow-500/30' }
    return { text: 'Weak', color: 'text-gray-400', bgColor: 'bg-gray-500/10 border-gray-500/30' }
  }

  const topRelationships = relationships.slice(0, 10)

  // Calculate network metrics
  const networkStats = useMemo(() => {
    const channelCounts = new Map<string, number>()
    relationships.forEach(rel => {
      channelCounts.set(rel.channel1, (channelCounts.get(rel.channel1) || 0) + 1)
      channelCounts.set(rel.channel2, (channelCounts.get(rel.channel2) || 0) + 1)
    })

    const sortedChannels = Array.from(channelCounts.entries())
      .sort(([, a], [, b]) => b - a)

    const averageConnections = channelCounts.size > 0 
      ? Array.from(channelCounts.values()).reduce((sum, count) => sum + count, 0) / channelCounts.size 
      : 0

    return {
      totalRelationships: relationships.length,
      connectedChannels: channelCounts.size,
      mostConnectedChannels: sortedChannels.slice(0, 5),
      averageConnections: Math.round(averageConnections * 10) / 10,
      strongRelationships: relationships.filter(r => r.coWatchScore >= 50).length
    }
  }, [relationships])

  return (
    <Card className={`p-6 bg-black/40 backdrop-blur-xl border-white/5 ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <Link className="w-5 h-5 text-purple-400" />
        <h2 className="text-xl font-semibold text-white">Channel Relationships</h2>
        <Badge variant="outline">{relationships.length} relationships</Badge>
      </div>

      {relationships.length > 0 ? (
        <div className="space-y-6">
          {/* Network Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="text-center p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <BarChart3 className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{networkStats.totalRelationships}</div>
              <div className="text-sm text-gray-400">Total Relationships</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{networkStats.connectedChannels}</div>
              <div className="text-sm text-gray-400">Connected Channels</div>
            </div>
            
            <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <TrendingUp className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{networkStats.strongRelationships}</div>
              <div className="text-sm text-gray-400">Strong Bonds</div>
            </div>
          </div>

          {/* Most Connected Channels */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-400" />
              Network Hubs
            </h3>
            <div className="space-y-2">
              {networkStats.mostConnectedChannels.map(([channel, connections], index) => (
                <div
                  key={channel}
                  className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/10"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-xs">
                      {index + 1}
                    </div>
                    <span className="text-white font-medium">{channel}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-semibold">{connections}</span>
                    <span className="text-gray-400 text-sm ml-1">connections</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Relationships */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Strongest Relationships</h3>
            <div className="space-y-3">
              {topRelationships.map((relationship, index) => {
                const strength = getRelationshipStrength(relationship.coWatchScore)
                
                return (
                  <motion.div
                    key={`${relationship.channel1}-${relationship.channel2}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border ${strength.bgColor}`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className={strength.color}>{strength.text}</Badge>
                        <span className="text-white font-medium">{relationship.coWatchScore}% co-watch</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-white font-medium">{relationship.channel1}</span>
                      <div className="flex-1 flex items-center justify-center">
                        <div className="h-px bg-gradient-to-r from-purple-500 to-pink-500 flex-1"></div>
                        <Link className="w-4 h-4 text-purple-400 mx-2" />
                        <div className="h-px bg-gradient-to-r from-pink-500 to-purple-500 flex-1"></div>
                      </div>
                      <span className="text-white font-medium">{relationship.channel2}</span>
                    </div>
                    
                    {relationship.topicOverlap.length > 0 && (
                      <div>
                        <div className="text-sm text-gray-400 mb-2">Shared Topics:</div>
                        <div className="flex flex-wrap gap-1">
                          {relationship.topicOverlap.slice(0, 5).map(topic => (
                            <Badge key={topic} variant="outline" className="text-xs">
                              {topic}
                            </Badge>
                          ))}
                          {relationship.topicOverlap.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{relationship.topicOverlap.length - 5} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Network Insights */}
          <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
            <h3 className="text-lg font-semibold text-white mb-2">Network Insights</h3>
            <div className="space-y-2 text-sm text-gray-300">
              <div>• You have {networkStats.averageConnections} average connections per channel in your network</div>
              <div>• {networkStats.strongRelationships} channels have strong co-watching patterns (50%+ overlap)</div>
              <div>• {networkStats.connectedChannels} of your channels are part of viewing relationship clusters</div>
              {networkStats.mostConnectedChannels.length > 0 && (
                <div>• <strong>{networkStats.mostConnectedChannels[0][0]}</strong> is your most connected hub channel</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <Link className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">No Channel Relationships Detected</p>
          <p className="text-sm">
            Channel relationships are detected when you watch multiple channels in the same sessions.
            Import more viewing history to see connection patterns.
          </p>
        </div>
      )}
    </Card>
  )
}