'use client'

import { useState, useMemo } from 'react'
import { WatchRecord, FilterOptions } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { Calculator, PieChart as PieChartIcon, BarChart3, Target } from 'lucide-react'

interface StatisticalDeepDiveProps {
  data: WatchRecord[]
  filters: FilterOptions
}

interface PercentileData {
  label: string
  value: number
  description: string
}

interface TopChannelData {
  channel: string
  count: number
  percentage: number
  percentile: string
}

export function StatisticalDeepDive({ data, filters }: StatisticalDeepDiveProps) {
  const [activeView, setActiveView] = useState<'percentiles' | 'distribution' | 'channels'>('percentiles')

  const statisticalData = useMemo(() => {
    const validRecords = data.filter(r => r.watchedAt !== null)
    
    if (validRecords.length === 0) {
      return {
        percentiles: [],
        channelDistribution: [],
        topChannels: [],
        totalVideos: 0
      }
    }

    // Channel frequency analysis
    const channelCounts = new Map<string, number>()
    validRecords.forEach(record => {
      if (record.channelTitle) {
        channelCounts.set(record.channelTitle, (channelCounts.get(record.channelTitle) || 0) + 1)
      }
    })

    const sortedChannels = Array.from(channelCounts.entries())
      .sort(([, a], [, b]) => b - a)
    
    const totalVideos = validRecords.length
    
    // Calculate percentiles for top channels
    const topChannels: TopChannelData[] = sortedChannels.slice(0, 20).map(([channel, count], index) => {
      let percentile = 'TOP_1%'
      if (index >= sortedChannels.length * 0.01) percentile = 'TOP_5%'
      if (index >= sortedChannels.length * 0.05) percentile = 'TOP_10%'
      if (index >= sortedChannels.length * 0.10) percentile = 'TOP_25%'
      
      return {
        channel: channel.length > 25 ? channel.slice(0, 25) + '...' : channel,
        count,
        percentage: (count / totalVideos) * 100,
        percentile
      }
    })

    // Percentile analysis
    const counts = Array.from(channelCounts.values()).sort((a, b) => b - a)
    const percentiles: PercentileData[] = [
      {
        label: 'P99',
        value: getPercentile(counts, 0.99),
        description: 'Top 1% of channels'
      },
      {
        label: 'P95',
        value: getPercentile(counts, 0.95),
        description: 'Top 5% of channels'
      },
      {
        label: 'P90',
        value: getPercentile(counts, 0.90),
        description: 'Top 10% of channels'
      },
      {
        label: 'P75',
        value: getPercentile(counts, 0.75),
        description: 'Top 25% of channels'
      },
      {
        label: 'P50',
        value: getPercentile(counts, 0.50),
        description: 'Median channel'
      },
      {
        label: 'P25',
        value: getPercentile(counts, 0.25),
        description: 'Bottom 75% of channels'
      }
    ]

    // Distribution analysis
    const distributionBuckets = [
      { range: '1 video', count: 0, color: '#EF4444' },
      { range: '2-5 videos', count: 0, color: '#F97316' },
      { range: '6-10 videos', count: 0, color: '#EAB308' },
      { range: '11-25 videos', count: 0, color: '#22C55E' },
      { range: '26-50 videos', count: 0, color: '#3B82F6' },
      { range: '50+ videos', count: 0, color: '#8B5CF6' }
    ]

    counts.forEach(count => {
      if (count === 1) distributionBuckets[0].count++
      else if (count <= 5) distributionBuckets[1].count++
      else if (count <= 10) distributionBuckets[2].count++
      else if (count <= 25) distributionBuckets[3].count++
      else if (count <= 50) distributionBuckets[4].count++
      else distributionBuckets[5].count++
    })

    return {
      percentiles,
      channelDistribution: distributionBuckets,
      topChannels,
      totalVideos,
      uniqueChannels: channelCounts.size,
      mean: counts.length > 0 ? counts.reduce((sum, count) => sum + count, 0) / counts.length : 0,
      median: getPercentile(counts, 0.50)
    }
  }, [data, filters])

  function getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0
    const index = Math.ceil(sortedArray.length * (1 - percentile)) - 1
    return sortedArray[Math.max(0, index)] || 0
  }

  const views = [
    { id: 'percentiles', label: 'PERCENTILES', icon: Calculator },
    { id: 'distribution', label: 'DISTRIBUTION', icon: PieChartIcon },
    { id: 'channels', label: 'TOP_CHANNELS', icon: BarChart3 }
  ] as const

  return (
    <Card className="terminal-surface border-terminal-border p-6">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-terminal-text terminal-text mb-2">STATISTICAL_DEEP_DIVE</h3>
            <p className="text-sm text-terminal-muted terminal-text">
              Advanced percentile analysis and distribution metrics
            </p>
          </div>
          
          <div className="flex gap-2">
            {views.map(view => (
              <Button
                key={view.id}
                variant={activeView === view.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveView(view.id)}
                className="text-xs"
              >
                <view.icon className="w-3 h-3 mr-1" />
                {view.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center terminal-surface border-terminal-border rounded p-3">
            <div className="text-lg font-bold text-terminal-text terminal-text">
              {statisticalData.totalVideos.toLocaleString()}
            </div>
            <div className="text-xs text-terminal-muted terminal-text">TOTAL_VIDEOS</div>
          </div>
          <div className="text-center terminal-surface border-terminal-border rounded p-3">
            <div className="text-lg font-bold text-terminal-text terminal-text">
              {statisticalData.uniqueChannels.toLocaleString()}
            </div>
            <div className="text-xs text-terminal-muted terminal-text">UNIQUE_CHANNELS</div>
          </div>
          <div className="text-center terminal-surface border-terminal-border rounded p-3">
            <div className="text-lg font-bold text-terminal-text terminal-text">
              {statisticalData.mean.toFixed(1)}
            </div>
            <div className="text-xs text-terminal-muted terminal-text">MEAN_PER_CHANNEL</div>
          </div>
          <div className="text-center terminal-surface border-terminal-border rounded p-3">
            <div className="text-lg font-bold text-terminal-text terminal-text">
              {statisticalData.median}
            </div>
            <div className="text-xs text-terminal-muted terminal-text">MEDIAN_PER_CHANNEL</div>
          </div>
        </div>

        {/* Dynamic Content Based on Active View */}
        <div className="space-y-4">
          {activeView === 'percentiles' && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-terminal-text terminal-text">
                CHANNEL_PERCENTILE_ANALYSIS
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {statisticalData.percentiles.map(percentile => (
                  <div 
                    key={percentile.label}
                    className="flex justify-between items-center p-3 terminal-surface border-terminal-border rounded"
                  >
                    <div>
                      <div className="text-sm font-bold text-terminal-text terminal-text">
                        {percentile.label}
                      </div>
                      <div className="text-xs text-terminal-muted terminal-text">
                        {percentile.description}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-terminal-text terminal-text">
                      {percentile.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === 'distribution' && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-terminal-text terminal-text">
                CHANNEL_VIDEO_DISTRIBUTION
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statisticalData.channelDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ range, count }) => count > 0 ? `${range}: ${count}` : ''}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {statisticalData.channelDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {activeView === 'channels' && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-terminal-text terminal-text">
                TOP_CHANNEL_ANALYSIS
              </h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statisticalData.topChannels.slice(0, 10)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      type="number"
                      stroke="#9CA3AF"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis 
                      type="category"
                      dataKey="channel"
                      stroke="#9CA3AF"
                      fontSize={10}
                      tickLine={false}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value: number, name: string) => [
                        `${value} videos (${((value / statisticalData.totalVideos) * 100).toFixed(1)}%)`, 
                        'Videos'
                      ]}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="#10B981"
                      radius={[0, 2, 2, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}