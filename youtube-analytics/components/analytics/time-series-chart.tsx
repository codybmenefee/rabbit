'use client'

import { Card } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { TimeSeriesPoint } from '@/lib/advanced-analytics'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface TimeSeriesChartProps {
  title: string
  data: TimeSeriesPoint[]
  color: string
  height?: number
  showTrend?: boolean
}

export function TimeSeriesChart({ 
  title, 
  data, 
  color, 
  height = 300, 
  showTrend = true 
}: TimeSeriesChartProps) {
  // Calculate trend
  const calculateTrend = () => {
    if (data.length < 2) return { direction: 'stable', percentage: 0 }
    
    const firstHalf = data.slice(0, Math.floor(data.length / 2))
    const secondHalf = data.slice(Math.floor(data.length / 2))
    
    const firstAvg = firstHalf.reduce((sum, point) => sum + point.value, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((sum, point) => sum + point.value, 0) / secondHalf.length
    
    if (firstAvg === 0) return { direction: 'stable', percentage: 0 }
    
    const percentage = ((secondAvg - firstAvg) / firstAvg) * 100
    let direction: 'up' | 'down' | 'stable' = 'stable'
    
    if (percentage > 5) direction = 'up'
    else if (percentage < -5) direction = 'down'
    
    return { direction, percentage: Math.abs(percentage) }
  }

  const trend = calculateTrend()
  const maxValue = Math.max(...data.map(d => d.value))
  const minValue = Math.min(...data.map(d => d.value))
  const totalValue = data.reduce((sum, d) => sum + d.value, 0)
  const avgValue = data.length > 0 ? totalValue / data.length : 0

  const formatDataForChart = (data: TimeSeriesPoint[]) => {
    // For daily data, show every 7th point to avoid crowding
    // For weekly/monthly, show all points
    const shouldSample = data.length > 30
    
    if (!shouldSample) return data
    
    return data.filter((_, index) => index % Math.ceil(data.length / 20) === 0)
  }

  const chartData = formatDataForChart(data)

  const getTrendIcon = () => {
    switch (trend.direction) {
      case 'up': return TrendingUp
      case 'down': return TrendingDown
      default: return Minus
    }
  }

  const getTrendColor = () => {
    switch (trend.direction) {
      case 'up': return 'text-signal-green-400'
      case 'down': return 'text-signal-red-400'
      default: return 'text-terminal-muted'
    }
  }

  const TrendIcon = getTrendIcon()

  return (
    <Card className="terminal-surface border-terminal-border p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold text-terminal-text terminal-text">{title}</h3>
            <p className="text-sm text-terminal-muted terminal-text">
              {data.length} data points • Avg: {avgValue.toFixed(1)}
            </p>
          </div>
          
          {showTrend && trend.direction !== 'stable' && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded terminal-surface border-terminal-border ${getTrendColor()}`}>
              <TrendIcon className="w-4 h-4" />
              <span className="text-sm font-medium">
                {trend.percentage.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Chart */}
        <div style={{ height: `${height}px` }}>
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="label"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                  formatter={(value: number) => [value, 'Value']}
                />
                <Line 
                  type="monotone"
                  dataKey="value" 
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, stroke: color, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-terminal-muted">
              <div className="text-center">
                <div className="text-sm terminal-text">NO_DATA_AVAILABLE</div>
                <div className="text-xs terminal-text mt-1">
                  Insufficient data points for time series analysis
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-terminal-border">
          <div className="text-center">
            <div className="text-lg font-bold text-terminal-text terminal-text">
              {maxValue.toLocaleString()}
            </div>
            <div className="text-xs text-terminal-muted terminal-text">PEAK</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-terminal-text terminal-text">
              {avgValue.toFixed(1)}
            </div>
            <div className="text-xs text-terminal-muted terminal-text">AVERAGE</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-terminal-text terminal-text">
              {minValue.toLocaleString()}
            </div>
            <div className="text-xs text-terminal-muted terminal-text">MINIMUM</div>
          </div>
        </div>
      </div>
    </Card>
  )
}