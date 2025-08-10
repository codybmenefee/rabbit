'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber, formatPercentage } from '@/lib/utils'
import { ChannelMetrics } from '@/types/records'

interface TopChannelsChartProps {
  data: ChannelMetrics[]
  title?: string
  height?: number
  limit?: number
}

const channelColors = [
  'rgb(147, 51, 234)',   // Purple
  'rgb(168, 85, 247)',   // Lighter purple
  'rgb(236, 72, 153)',   // Pink
  'rgb(59, 130, 246)',   // Blue
  'rgb(34, 197, 94)',    // Green
  'rgb(249, 115, 22)',   // Orange
  'rgb(239, 68, 68)',    // Red
  'rgb(6, 182, 212)',    // Cyan
  'rgb(245, 158, 11)',   // Amber
  'rgb(139, 92, 246)',   // Violet
]

export function TopChannelsChart({ 
  data, 
  title = 'Top Channels',
  height = 400,
  limit = 10 
}: TopChannelsChartProps) {
  const chartData = data.slice(0, limit)

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
            Most watched channels by video count
          </p>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              <BarChart
                data={chartData}
                layout="horizontal"
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255,255,255,0.1)" 
                  horizontal={false}
                  vertical={true}
                />
                
                <XAxis 
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgb(156, 163, 175)', fontSize: 12 }}
                  tickFormatter={(value) => formatNumber(value)}
                />
                
                <YAxis 
                  type="category"
                  dataKey="channel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgb(156, 163, 175)', fontSize: 11 }}
                  width={120}
                  tickFormatter={(value: string) => 
                    value.length > 15 ? value.substring(0, 12) + '...' : value
                  }
                />
                
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)',
                    color: 'white'
                  }}
                  labelStyle={{ color: 'rgb(156, 163, 175)' }}
                  formatter={(value: number, name: string) => [
                    `${formatNumber(value)} videos (${formatPercentage(
                      chartData.find(d => d.videoCount === value)?.percentage || 0
                    )})`,
                    name === 'videoCount' ? 'Videos' : name
                  ]}
                />

                <Bar 
                  dataKey="videoCount" 
                  radius={[0, 4, 4, 0]}
                  name="Videos"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={channelColors[index % channelColors.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function CompactChannelsList({ 
  data, 
  title = 'Top Channels',
  limit = 5 
}: Omit<TopChannelsChartProps, 'height'>) {
  const topChannels = data.slice(0, limit)

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold text-white">
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {topChannels.map((channel, index) => (
            <motion.div
              key={channel.channel}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: channelColors[index % channelColors.length] }}
                />
                <span className="text-white font-medium truncate">
                  {channel.channel}
                </span>
              </div>
              
              <div className="text-right">
                <div className="text-white font-semibold">
                  {formatNumber(channel.videoCount)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatPercentage(channel.percentage, 1)}
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}