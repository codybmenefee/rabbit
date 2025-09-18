'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Tooltip, Legend } from 'recharts'
import { Calendar, Clock, Zap, TrendingUp, Users, Play, Sun, Moon, Coffee } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WatchRecord } from '@/types/records'
import { computeViewingPatterns } from '@/lib/aggregations'

interface HistoryInsightsProps {
  records: WatchRecord[]
  analytics: {
    totalVideos: number
    uniqueChannels: number
    totalDays: number
    avgVideosPerDay: number
    dateRange: { start: Date | null, end: Date | null }
    sessionAnalysis: {
      sessions: Array<{
        id: string
        startTime: string
        endTime: string
        videos: WatchRecord[]
        duration: number
        avgGapMinutes: number
      }>
      totalSessions: number
      avgSessionLength: number
      avgVideosPerSession: number
    }
  }
}

export function HistoryInsights({ records, analytics }: HistoryInsightsProps) {
  // Compute viewing patterns
  const viewingPatterns = useMemo(() => computeViewingPatterns(records), [records])

  // Compute additional insights
  const insights = useMemo(() => {
    const validRecords = records.filter(r => r.watchedAt !== null)
    
    if (validRecords.length === 0) return null

    // Most active time of day
    const hourCounts = Array(24).fill(0)
    validRecords.forEach(record => {
      if (record.hour !== null) hourCounts[record.hour]++
    })
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts))

    // Most active day of week
    const dayCounts = Array(7).fill(0)
    validRecords.forEach(record => {
      if (record.dayOfWeek !== null) dayCounts[record.dayOfWeek]++
    })
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const peakDay = dayNames[dayCounts.indexOf(Math.max(...dayCounts))]

    // Top topics
    const topicCounts = new Map<string, number>()
    validRecords.forEach(record => {
      record.topics.forEach(topic => {
        topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)
      })
    })
    const topTopics = Array.from(topicCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)

    // Platform distribution
    const platformCounts = validRecords.reduce((acc, record) => {
      acc[record.product] = (acc[record.product] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Viewing consistency (days with activity vs total days)
    const activeDays = new Set(
      validRecords.map(r => r.watchedAt!.split('T')[0])
    ).size
    const consistency = analytics.totalDays > 0 ? (activeDays / analytics.totalDays) * 100 : 0

    return {
      peakHour,
      peakDay,
      topTopics,
      platformCounts,
      consistency: Math.round(consistency),
      activeDays
    }
  }, [records, analytics])

  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}${period}`
  }

  const getHourLabel = (hour: number) => {
    if (hour >= 5 && hour < 12) return 'Morning'
    if (hour >= 12 && hour < 17) return 'Afternoon'
    if (hour >= 17 && hour < 21) return 'Evening'
    return 'Night'
  }

  const getTimeIcon = (hour: number) => {
    if (hour >= 6 && hour < 18) return <Sun className="w-4 h-4 text-yellow-500" />
    return <Moon className="w-4 h-4 text-blue-400" />
  }

  if (!insights) {
    return (
      <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
        <CardContent className="p-8 text-center">
          <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No insights available</h3>
          <p className="text-gray-400">Import more data to see viewing patterns and insights.</p>
        </CardContent>
      </Card>
    )
  }

  const COLORS = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div className="space-y-6">
      {/* Key Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              {getTimeIcon(insights.peakHour)}
              <Badge variant="outline" className="text-xs text-purple-300">
                Peak Time
              </Badge>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {formatHour(insights.peakHour)}
            </div>
            <div className="text-xs text-gray-400">
              {getHourLabel(insights.peakHour)} person
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-4 h-4 text-blue-400" />
              <Badge variant="outline" className="text-xs text-blue-300">
                Peak Day
              </Badge>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {insights.peakDay.slice(0, 3)}
            </div>
            <div className="text-xs text-gray-400">
              Most active day
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-4 h-4 text-green-400" />
              <Badge variant="outline" className="text-xs text-green-300">
                Consistency
              </Badge>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {insights.consistency}%
            </div>
            <div className="text-xs text-gray-400">
              {insights.activeDays} active days
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <Play className="w-4 h-4 text-red-400" />
              <Badge variant="outline" className="text-xs text-red-300">
                Sessions
              </Badge>
            </div>
            <div className="text-2xl font-bold text-white mb-1">
              {analytics.sessionAnalysis.totalSessions}
            </div>
            <div className="text-xs text-gray-400">
              {Math.round(analytics.sessionAnalysis.avgSessionLength)}min avg
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Distribution */}
        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Hourly Viewing Pattern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={viewingPatterns.hourlyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="hour" 
                    stroke="#9CA3AF" 
                    fontSize={12}
                    tickFormatter={formatHour}
                  />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value, name) => [value, 'Videos']}
                    labelFormatter={(hour) => `${formatHour(hour)} (${getHourLabel(hour)})`}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#8b5cf6" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Platform Distribution */}
        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Platform Usage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(insights.platformCounts).map(([platform, count]) => ({
                      name: platform,
                      value: count,
                      percentage: ((count / analytics.totalVideos) * 100).toFixed(1)
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {Object.entries(insights.platformCounts).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value, name, props) => [
                      `${value} videos (${props.payload.percentage}%)`,
                      name
                    ]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Daily Distribution */}
        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Weekly Pattern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={viewingPatterns.dailyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="day" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    formatter={(value, name) => [value, 'Videos']}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#06b6d4" 
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Topics */}
        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Top Content Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.topTopics.map(([topic, count], index) => {
                const percentage = ((count / analytics.totalVideos) * 100).toFixed(1)
                return (
                  <div key={topic} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm text-white font-medium">{topic}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{count} videos</span>
                      <Badge variant="outline" className="text-xs">
                        {percentage}%
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Insights */}
      <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white">Viewing Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            <div>
              <div className="text-gray-400 mb-1">Total Videos</div>
              <div className="text-xl font-bold text-white">{analytics.totalVideos}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Average Daily</div>
              <div className="text-xl font-bold text-white">{analytics.avgVideosPerDay.toFixed(1)}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Unique Channels</div>
              <div className="text-xl font-bold text-white">{analytics.uniqueChannels}</div>
            </div>
            <div>
              <div className="text-gray-400 mb-1">Data Span</div>
              <div className="text-xl font-bold text-white">{analytics.totalDays} days</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}