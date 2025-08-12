'use client'

import { motion } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Calendar, Activity } from 'lucide-react'
import { TopicEvolutionData } from '@/lib/topic-aggregations'

interface InterestEvolutionChartProps {
  data: TopicEvolutionData[]
  title?: string
}

const topicColors: Record<string, string> = {
  'Technology': '#8b5cf6',
  'Finance': '#10b981',
  'Politics': '#f59e0b',
  'Entertainment': '#ec4899',
  'Education': '#3b82f6',
  'Gaming': '#ef4444',
  'Music': '#8b5cf6',
  'Sports': '#06b6d4',
  'News': '#f97316',
  'Science': '#14b8a6',
  'Cooking': '#84cc16',
  'Travel': '#6366f1',
  'Other': '#6b7280'
}

export function InterestEvolutionChart({ data, title = 'Interest Evolution Over Time' }: InterestEvolutionChartProps) {
  // Get top 6 topics for better visibility
  const topTopics = data.slice(0, 6)
  
  // Transform data for chart
  const chartData = transformDataForChart(topTopics)
  
  // Calculate insights
  const insights = calculateInsights(topTopics)

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {title}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track how your interests have evolved over time
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="flex gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-white">{insights.fastestGrowing}</div>
                <div className="text-xs text-gray-400">Fastest Growing</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{insights.mostConsistent}</div>
                <div className="text-xs text-gray-400">Most Consistent</div>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Evolution Chart */}
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="period" 
                  stroke="#9ca3af" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12}
                  label={{ value: 'Videos', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelStyle={{ color: '#d1d5db' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="line"
                />
                
                {topTopics.map((topic, index) => (
                  <Line
                    key={topic.topic}
                    type="monotone"
                    dataKey={topic.topic}
                    stroke={topicColors[topic.topic] || `hsl(${index * 60}, 70%, 60%)`}
                    strokeWidth={2}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Topic Growth Badges */}
          <div className="flex flex-wrap gap-2">
            {topTopics.map((topic, index) => {
              const growthRate = topic.growthRate
              const isGrowing = growthRate > 10
              const isDeclined = growthRate < -10
              
              return (
                <motion.div
                  key={topic.topic}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.1, duration: 0.2 }}
                >
                  <Badge 
                    variant={isGrowing ? 'default' : isDeclined ? 'destructive' : 'secondary'}
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: topicColors[topic.topic] || '#6b7280' }}
                    />
                    {topic.topic}
                    <span className="text-xs opacity-75">
                      {growthRate > 0 ? '+' : ''}{growthRate.toFixed(0)}%
                    </span>
                  </Badge>
                </motion.div>
              )
            })}
          </div>

          {/* Insights Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-200">Trending Interest</span>
              </div>
              <div className="text-lg font-bold text-white">{insights.fastestGrowing}</div>
              <div className="text-xs text-gray-400">
                +{insights.fastestGrowthRate.toFixed(0)}% growth in recent months
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-200">Seasonal Peak</span>
              </div>
              <div className="text-lg font-bold text-white">{insights.seasonalPeak.topic}</div>
              <div className="text-xs text-gray-400">
                Peak activity in {insights.seasonalPeak.period}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Helper functions
function transformDataForChart(topics: TopicEvolutionData[]) {
  const periodMap = new Map<string, Record<string, number>>()

  // Collect all periods and initialize data structure
  topics.forEach(topic => {
    topic.timeline.forEach(timePoint => {
      if (!periodMap.has(timePoint.period)) {
        periodMap.set(timePoint.period, { period: timePoint.period })
      }
      const periodData = periodMap.get(timePoint.period)!
      periodData[topic.topic] = timePoint.count
    })
  })

  // Convert to array and sort by period
  const result = Array.from(periodMap.values()).sort((a, b) => {
    const dateA = new Date(a.period + ' 01')
    const dateB = new Date(b.period + ' 01')
    return dateA.getTime() - dateB.getTime()
  })

  return result
}

function calculateInsights(topics: TopicEvolutionData[]) {
  // Find fastest growing topic
  const fastestGrowingTopic = topics.reduce((prev, current) => 
    current.growthRate > prev.growthRate ? current : prev
  )

  // Find most consistent topic (lowest variance in growth)
  const mostConsistentTopic = topics.reduce((prev, current) => {
    const prevVariance = calculateVariance(prev.timeline.map(t => t.count))
    const currentVariance = calculateVariance(current.timeline.map(t => t.count))
    return currentVariance < prevVariance ? current : prev
  })

  // Find topic with most notable seasonal peak
  const seasonalPeakTopic = topics.reduce((prev, current) => {
    if (current.seasonality.peak === 'Unknown') return prev
    return current.totalVideos > prev.totalVideos ? current : prev
  })

  return {
    fastestGrowing: fastestGrowingTopic.topic,
    fastestGrowthRate: fastestGrowingTopic.growthRate,
    mostConsistent: mostConsistentTopic.topic,
    seasonalPeak: {
      topic: seasonalPeakTopic.topic,
      period: seasonalPeakTopic.seasonality.peak
    }
  }
}

function calculateVariance(numbers: number[]): number {
  if (numbers.length <= 1) return 0
  
  const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length
  const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2))
  const variance = squaredDiffs.reduce((sum, sq) => sum + sq, 0) / numbers.length
  
  return variance
}