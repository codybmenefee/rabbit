'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { CreatorMetrics } from '@/types'
import { formatDuration } from '@/lib/utils'

interface CreatorLoyaltyMatrixProps {
  creators: CreatorMetrics[]
}

const categoryColors = {
  Technology: '#3B82F6',
  Finance: '#10B981',
  Science: '#8B5CF6',
  Politics: '#EF4444',
  Entertainment: '#F59E0B',
  Education: '#06B6D4',
  Gaming: '#EC4899',
  Music: '#F97316',
  Sports: '#84CC16',
  News: '#6366F1'
}

export function CreatorLoyaltyMatrix({ creators }: CreatorLoyaltyMatrixProps) {
  // Transform creator data for scatter plot
  const scatterData = creators.map(creator => ({
    name: creator.channel,
    frequency: creator.videoCount,
    avgDuration: creator.averageWatchTime / 60, // Convert to minutes
    totalTime: creator.totalWatchTime,
    loyalty: creator.loyaltyScore,
    category: creator.category
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="glass-card p-4 border border-white/20 min-w-48">
          <p className="font-semibold text-foreground mb-2">{data.name}</p>
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Videos watched: <span className="text-foreground font-medium">{data.frequency}</span>
            </p>
            <p className="text-muted-foreground">
              Avg duration: <span className="text-foreground font-medium">{Math.round(data.avgDuration)}min</span>
            </p>
            <p className="text-muted-foreground">
              Total time: <span className="text-foreground font-medium">{formatDuration(data.totalTime)}</span>
            </p>
            <p className="text-muted-foreground">
              Loyalty score: <span className="text-foreground font-medium">{data.loyalty}/100</span>
            </p>
            <div className="flex items-center space-x-2 pt-1">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: categoryColors[data.category as keyof typeof categoryColors] }}
              />
              <span className="text-muted-foreground">{data.category}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="gradient-text">Creator Loyalty Matrix</CardTitle>
        <p className="text-sm text-muted-foreground">
          Bubble size = total watch time • Position shows engagement patterns
        </p>
      </CardHeader>
      <CardContent>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="h-80"
        >
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              data={scatterData}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                type="number" 
                dataKey="frequency" 
                name="Videos Watched"
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
              />
              <YAxis 
                type="number" 
                dataKey="avgDuration" 
                name="Avg Duration (min)"
                stroke="rgba(255,255,255,0.5)"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter dataKey="totalTime">
                {scatterData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={categoryColors[entry.category as keyof typeof categoryColors]}
                    fillOpacity={0.8}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Quadrant Labels */}
        <div className="relative mt-4">
          <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            <div className="text-left">
              <span className="font-medium text-orange-400">Discovering</span>
              <p>Few videos, short duration</p>
            </div>
            <div className="text-right">
              <span className="font-medium text-blue-400">Loyal</span>
              <p>Many videos, long duration</p>
            </div>
            <div className="text-left">
              <span className="font-medium text-purple-400">Casual</span>
              <p>Few videos, long duration</p>
            </div>
            <div className="text-right">
              <span className="font-medium text-red-400">Abandoning</span>
              <p>Many videos, short duration</p>
            </div>
          </div>
        </div>

        {/* Category Legend */}
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-white/10">
          {Object.entries(categoryColors).map(([category, color]) => (
            <motion.div
              key={category}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center space-x-2"
            >
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-muted-foreground">{category}</span>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}