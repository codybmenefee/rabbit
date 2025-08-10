'use client'

import { motion } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthlyCount } from '@/types/records'

interface MonthlyTrendChartProps {
  data: MonthlyCount[]
  title?: string
  height?: number
}

export function MonthlyTrendChart({ 
  data, 
  title = 'Monthly Viewing Trend',
  height = 300 
}: MonthlyTrendChartProps) {
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
            Videos watched over time
          </p>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="videoGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(147, 51, 234)" stopOpacity={0.8} />
                    <stop offset="50%" stopColor="rgb(168, 85, 247)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="rgb(196, 181, 253)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="channelGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(255,255,255,0.1)" 
                  horizontal={true}
                  vertical={false}
                />
                
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgb(156, 163, 175)', fontSize: 12 }}
                  tickMargin={10}
                />
                
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'rgb(156, 163, 175)', fontSize: 12 }}
                  tickMargin={10}
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
                />

                <Area
                  type="monotone"
                  dataKey="videos"
                  stroke="rgb(147, 51, 234)"
                  strokeWidth={2}
                  fill="url(#videoGradient)"
                  name="Videos Watched"
                />
                
                <Area
                  type="monotone"
                  dataKey="uniqueChannels"
                  stroke="rgb(34, 197, 94)"
                  strokeWidth={2}
                  fill="url(#channelGradient)"
                  name="Unique Channels"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function SimpleMonthlyLineChart({ 
  data, 
  title = 'Monthly Videos',
  height = 200 
}: MonthlyTrendChartProps) {
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
        <CardContent className="pt-0">
          <div style={{ width: '100%', height }}>
            <ResponsiveContainer>
              <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                <Line
                  type="monotone"
                  dataKey="videos"
                  stroke="rgb(147, 51, 234)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ 
                    r: 4, 
                    fill: 'rgb(147, 51, 234)',
                    stroke: 'rgba(0, 0, 0, 0.5)',
                    strokeWidth: 2
                  }}
                />
                
                <XAxis 
                  dataKey="month" 
                  hide
                />
                
                <YAxis hide />
                
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)',
                    color: 'white'
                  }}
                  labelStyle={{ color: 'rgb(156, 163, 175)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}