'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TimeSeriesData } from '@/types'
import { format } from 'date-fns'

interface StreamGraphProps {
  data: TimeSeriesData[]
}

const topicColors = {
  Technology: '#3B82F6',
  Finance: '#10B981',
  Science: '#8B5CF6',
  Politics: '#EF4444',
  Entertainment: '#F59E0B',
  Education: '#06B6D4'
}

export function StreamGraph({ data }: StreamGraphProps) {
  const topics = Object.keys(topicColors)

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-3 border border-white/20">
          <p className="text-sm font-medium mb-2">{format(new Date(label), 'MMM d, yyyy')}</p>
          {payload.map((entry: any) => (
            <div key={entry.dataKey} className="flex items-center justify-between space-x-3">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">{entry.dataKey}</span>
              </div>
              <span className="text-sm font-medium">{entry.value}h</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="gradient-text">Topic Evolution Stream</CardTitle>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="h-80"
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                {topics.map(topic => (
                  <linearGradient 
                    key={topic} 
                    id={`gradient-${topic}`} 
                    x1="0" y1="0" x2="0" y2="1"
                  >
                    <stop 
                      offset="5%" 
                      stopColor={topicColors[topic as keyof typeof topicColors]} 
                      stopOpacity={0.8}
                    />
                    <stop 
                      offset="95%" 
                      stopColor={topicColors[topic as keyof typeof topicColors]} 
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MMM d')}
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
              />
              <YAxis 
                stroke="rgba(255,255,255,0.5)" 
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {topics.map((topic, index) => (
                <Area
                  key={topic}
                  type="monotone"
                  dataKey={topic}
                  stackId="1"
                  stroke={topicColors[topic as keyof typeof topicColors]}
                  fill={`url(#gradient-${topic})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-white/10">
          {topics.map(topic => (
            <motion.div
              key={topic}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center space-x-2"
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: topicColors[topic as keyof typeof topicColors] }}
              />
              <span className="text-sm text-muted-foreground">{topic}</span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}