'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TopicTrend } from '@/types'
import { format, eachDayOfInterval, subDays } from 'date-fns'

interface TopicHeatmapProps {
  trends: TopicTrend[]
}

export function TopicHeatmap({ trends }: TopicHeatmapProps) {
  // Use useMemo to ensure consistent dates between server and client
  const { days, trendsByDate } = useMemo(() => {
    const today = new Date('2024-08-10') // Fixed date for consistency
    const startDate = subDays(today, 365)
    const daysArray = eachDayOfInterval({ start: startDate, end: today })
    
    // Group trends by date and topic
    const trendsMap = trends.reduce((acc, trend) => {
      const dateKey = format(trend.date, 'yyyy-MM-dd')
      if (!acc[dateKey]) acc[dateKey] = {}
      acc[dateKey][trend.topic] = trend.watchTime
      return acc
    }, {} as Record<string, Record<string, number>>)
    
    return { days: daysArray, trendsByDate: trendsMap }
  }, [trends])
  // Get intensity for a specific day and topic
  const getIntensity = (date: Date, topic: string) => {
    const dateKey = format(date, 'yyyy-MM-dd')
    const watchTime = trendsByDate[dateKey]?.[topic] || 0
    // Normalize to 0-4 scale for opacity
    return Math.min(4, Math.floor(watchTime / 2000))
  }

  const topics = ['Technology', 'Finance', 'Science', 'Politics']
  const topicColors = {
    Technology: 'bg-blue-500',
    Finance: 'bg-emerald-500',
    Science: 'bg-purple-500',
    Politics: 'bg-red-500'
  }

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="gradient-text">Topic Activity Heatmap</span>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            {topics.map(topic => (
              <div key={topic} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-sm ${topicColors[topic as keyof typeof topicColors]}`} />
                <span>{topic}</span>
              </div>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {topics.map((topic, topicIndex) => (
          <motion.div
            key={topic}
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: topicIndex * 0.1 }}
            className="space-y-2"
          >
            <h4 className="text-sm font-medium text-muted-foreground">{topic}</h4>
            <div className="flex flex-wrap gap-1">
              {days.map((day, dayIndex) => {
                const intensity = getIntensity(day, topic)
                return (
                  <motion.div
                    key={day.toISOString()}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: (topicIndex * 0.1) + (dayIndex * 0.001) }}
                    whileHover={{ scale: 1.2 }}
                    className={`
                      w-3 h-3 rounded-sm cursor-pointer transition-all duration-200
                      ${topicColors[topic as keyof typeof topicColors]}
                    `}
                    style={{ 
                      opacity: intensity === 0 ? 0.1 : intensity * 0.25 + 0.2 
                    }}
                    title={`${topic} - ${format(day, 'MMM d, yyyy')}`}
                  />
                )
              })}
            </div>
          </motion.div>
        ))}

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t border-white/10">
          <span>Less activity</span>
          <div className="flex space-x-1">
            {[0, 1, 2, 3, 4].map(level => (
              <div
                key={level}
                className="w-3 h-3 rounded-sm bg-primary"
                style={{ opacity: level === 0 ? 0.1 : level * 0.25 + 0.2 }}
              />
            ))}
          </div>
          <span>More activity</span>
        </div>
      </CardContent>
    </Card>
  )
}