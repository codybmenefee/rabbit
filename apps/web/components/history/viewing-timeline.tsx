'use client'

import { useMemo } from 'react'
import { format, parseISO, isValid, differenceInMinutes, startOfDay, isSameDay } from 'date-fns'
import { Clock, Play, Coffee, Moon, Sunrise, Sun, Sunset } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { WatchRecord } from '@/types/records'

interface ViewingTimelineProps {
  records: WatchRecord[]
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

interface TimelineEvent {
  id: string
  timestamp: Date
  type: 'video' | 'session-start' | 'session-end' | 'break'
  record?: WatchRecord
  sessionId?: string
  breakDuration?: number
}

export function ViewingTimeline({ records, sessionAnalysis }: ViewingTimelineProps) {
  // Group records by day and create timeline events
  const timelineData = useMemo(() => {
    if (!records.length) return []

    // Sort records by date
    const sortedRecords = records
      .filter(r => r.watchedAt && isValid(parseISO(r.watchedAt)))
      .sort((a, b) => new Date(a.watchedAt!).getTime() - new Date(b.watchedAt!).getTime())

    // Group by day
    const dailyGroups = new Map<string, WatchRecord[]>()
    
    sortedRecords.forEach(record => {
      const date = parseISO(record.watchedAt!)
      const dayKey = format(date, 'yyyy-MM-dd')
      
      if (!dailyGroups.has(dayKey)) {
        dailyGroups.set(dayKey, [])
      }
      dailyGroups.get(dayKey)!.push(record)
    })

    // Convert to timeline format
    return Array.from(dailyGroups.entries())
      .map(([dayKey, dayRecords]) => ({
        date: dayKey,
        records: dayRecords,
        totalVideos: dayRecords.length,
        timeSpan: {
          start: dayRecords[0].watchedAt!,
          end: dayRecords[dayRecords.length - 1].watchedAt!
        }
      }))
      .reverse() // Most recent first
      .slice(0, 30) // Last 30 days
  }, [records])

  const getTimeOfDayIcon = (hour: number) => {
    if (hour >= 5 && hour < 12) return <Sunrise className="w-4 h-4 text-yellow-400" />
    if (hour >= 12 && hour < 17) return <Sun className="w-4 h-4 text-orange-400" />
    if (hour >= 17 && hour < 21) return <Sunset className="w-4 h-4 text-red-400" />
    return <Moon className="w-4 h-4 text-blue-400" />
  }

  const getTimeOfDayLabel = (hour: number) => {
    if (hour >= 5 && hour < 12) return 'Morning'
    if (hour >= 12 && hour < 17) return 'Afternoon'  
    if (hour >= 17 && hour < 21) return 'Evening'
    return 'Night'
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

  if (timelineData.length === 0) {
    return (
      <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
        <CardContent className="p-8 text-center">
          <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No timeline data</h3>
          <p className="text-gray-400">
            Import more data or adjust filters to see your viewing timeline.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Session Summary */}
      <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Play className="w-5 h-5" />
            Session Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{sessionAnalysis.totalSessions}</div>
              <div className="text-xs text-gray-400">Total Sessions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{Math.round(sessionAnalysis.avgSessionLength)}</div>
              <div className="text-xs text-gray-400">Avg Minutes/Session</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{sessionAnalysis.avgVideosPerSession.toFixed(1)}</div>
              <div className="text-xs text-gray-400">Avg Videos/Session</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{timelineData.length}</div>
              <div className="text-xs text-gray-400">Active Days</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <div className="space-y-4">
        {timelineData.map((day, dayIndex) => {
          const dayDate = parseISO(day.date)
          const isToday = isSameDay(dayDate, new Date())
          const isRecent = dayIndex < 7

          // Group videos by time periods within the day
          const timeGroups = day.records.reduce((groups, record) => {
            const hour = parseISO(record.watchedAt!).getHours()
            const period = getTimeOfDayLabel(hour)
            
            if (!groups[period]) {
              groups[period] = []
            }
            groups[period].push(record)
            return groups
          }, {} as Record<string, WatchRecord[]>)

          return (
            <Card 
              key={day.date}
              className={`border-white/[0.08] backdrop-blur-xl ${
                isToday 
                  ? 'bg-purple-500/10 border-purple-500/30' 
                  : isRecent
                    ? 'bg-black/40'
                    : 'bg-black/30'
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      isToday ? 'bg-purple-500' : isRecent ? 'bg-blue-500' : 'bg-gray-600'
                    }`} />
                    <div>
                      <CardTitle className="text-white text-lg">
                        {format(dayDate, 'EEEE, MMMM dd')}
                        {isToday && (
                          <Badge className="ml-2 bg-purple-500/20 text-purple-300 text-xs">
                            Today
                          </Badge>
                        )}
                      </CardTitle>
                      <p className="text-sm text-gray-400 mt-1">
                        {day.totalVideos} videos • {format(parseISO(day.timeSpan.start), 'HH:mm')} - {format(parseISO(day.timeSpan.end), 'HH:mm')}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">
                      {Math.round(differenceInMinutes(parseISO(day.timeSpan.end), parseISO(day.timeSpan.start)))} min span
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {Object.entries(timeGroups)
                    .sort(([a], [b]) => {
                      const order = ['Morning', 'Afternoon', 'Evening', 'Night']
                      return order.indexOf(a) - order.indexOf(b)
                    })
                    .map(([period, videos]) => (
                      <div key={period} className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-white">
                          {getTimeOfDayIcon(parseISO(videos[0].watchedAt!).getHours())}
                          {period}
                          <Badge variant="outline" className="text-xs text-gray-400">
                            {videos.length} video{videos.length !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        
                        <div className="pl-6 space-y-2">
                          {videos.map((video, videoIndex) => (
                            <div 
                              key={video.id} 
                              className="flex items-start gap-3 p-2 rounded bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                            >
                              <div className="text-xs text-gray-500 font-mono mt-1 w-12 flex-shrink-0">
                                {format(parseISO(video.watchedAt!), 'HH:mm')}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="text-sm text-white line-clamp-2 mb-1">
                                  {video.videoTitle || 'Untitled Video'}
                                </div>
                                
                                <div className="flex items-center gap-2 text-xs text-gray-400 mb-1">
                                  <span>{video.channelTitle || 'Unknown Channel'}</span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs px-1.5 py-0.5 ${
                                      video.product === 'YouTube Music' 
                                        ? 'border-red-500/30 text-red-300' 
                                        : 'border-white/[0.08] text-gray-400'
                                    }`}
                                  >
                                    {video.product}
                                  </Badge>
                                </div>
                                
                                {video.topics.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {video.topics.slice(0, 3).map(topic => (
                                      <Badge
                                        key={topic}
                                        variant="outline"
                                        className={`text-xs px-1.5 py-0.5 ${getTopicColor(topic)}`}
                                      >
                                        {topic}
                                      </Badge>
                                    ))}
                                    {video.topics.length > 3 && (
                                      <Badge variant="outline" className="text-xs px-1.5 py-0.5 text-gray-400">
                                        +{video.topics.length - 3}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              {/* Session Indicators */}
                              <div className="flex items-center gap-1">
                                {videoIndex === 0 && videos.length > 1 && (
                                  <div className="w-2 h-2 rounded-full bg-green-500 opacity-60" title="Session start" />
                                )}
                                {videoIndex === videos.length - 1 && videos.length > 1 && (
                                  <div className="w-2 h-2 rounded-full bg-red-500 opacity-60" title="Session end" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Load More */}
      {timelineData.length >= 30 && (
        <Card className="border-white/[0.08] bg-black/40 backdrop-blur-xl">
          <CardContent className="p-4 text-center">
            <p className="text-gray-400 text-sm mb-3">
              Showing last 30 days of activity
            </p>
            <p className="text-xs text-gray-500">
              Use filters to explore different time periods
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}