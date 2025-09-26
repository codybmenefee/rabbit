'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DayHourMatrix } from '@/lib/types'

interface DayTimeHeatmapProps {
  data: DayHourMatrix[]
  title?: string
}

export function DayTimeHeatmap({ 
  data, 
  title = 'Viewing Pattern Heatmap' 
}: DayTimeHeatmapProps) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 24 }, (_, i) => i)
  
  // Find max value for normalization
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.filter(d => d.value > 0).map(d => d.value))
  
  // Get value for specific day and hour
  const getValue = (day: string, hour: number) => {
    const entry = data.find(d => d.day === day && d.hour === hour)
    return entry?.value || 0
  }

  // Get intensity (0-1) for heatmap coloring
  const getIntensity = (value: number) => {
    if (value === 0) return 0
    if (maxValue === minValue) return 1
    return (value - minValue) / (maxValue - minValue)
  }

  // Get color based on intensity
  const getColor = (intensity: number) => {
    if (intensity === 0) return 'rgba(255, 255, 255, 0.05)'
    
    // Purple to pink gradient based on intensity
    const baseColor = intensity < 0.5 
      ? `rgba(147, 51, 234, ${0.3 + intensity * 0.4})`  // Purple
      : `rgba(236, 72, 153, ${0.4 + (intensity - 0.5) * 0.6})`  // Pink
    
    return baseColor
  }

  const formatHour = (hour: number) => {
    if (hour === 0) return '12AM'
    if (hour === 12) return '12PM'
    if (hour < 12) return `${hour}AM`
    return `${hour - 12}PM`
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            When you watch videos throughout the week
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Hour labels */}
            <div className="flex gap-1 text-xs text-muted-foreground">
              <div className="w-10"></div> {/* Empty cell for day labels */}
              {hours.filter(h => h % 3 === 0).map(hour => (
                <div key={hour} className="flex-1 text-center">
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="space-y-1">
              {days.map((day, dayIndex) => (
                <motion.div
                  key={day}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: dayIndex * 0.05, duration: 0.3 }}
                  className="flex gap-1 items-center"
                >
                  {/* Day label */}
                  <div className="text-sm text-muted-foreground font-medium w-10 text-right">
                    {day}
                  </div>
                  
                  {/* Hour cells */}
                  {hours.map(hour => {
                    const value = getValue(day, hour)
                    const intensity = getIntensity(value)
                    const color = getColor(intensity)
                    
                    return (
                      <motion.div
                        key={`${day}-${hour}`}
                        className="w-3 h-3 rounded-sm border border-white/5 relative group cursor-pointer flex-shrink-0"
                        style={{ backgroundColor: color }}
                        whileHover={{ scale: 1.1, zIndex: 10 }}
                        transition={{ duration: 0.1 }}
                      >
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 bg-black/90 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                          {day} {formatHour(hour)}: {value} videos
                        </div>
                      </motion.div>
                    )
                  })}
                </motion.div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <span className="text-xs text-muted-foreground">Less</span>
              
              <div className="flex space-x-1">
                {[0, 0.2, 0.4, 0.6, 0.8, 1].map((intensity, i) => (
                  <div
                    key={i}
                    className="w-3 h-3 rounded-sm border border-white/5"
                    style={{ backgroundColor: getColor(intensity) }}
                  />
                ))}
              </div>
              
              <span className="text-xs text-muted-foreground">More</span>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div className="text-center">
                <div className="text-lg font-semibold text-white">
                  {maxValue}
                </div>
                <div className="text-xs text-muted-foreground">Peak Hour</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-white">
                  {data.reduce((sum, d) => sum + d.value, 0)}
                </div>
                <div className="text-xs text-muted-foreground">Total Videos</div>
              </div>
              
              <div className="text-center">
                <div className="text-lg font-semibold text-white">
                  {data.filter(d => d.value > 0).length}
                </div>
                <div className="text-xs text-muted-foreground">Active Hours</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}