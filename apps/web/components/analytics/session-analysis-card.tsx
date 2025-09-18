'use client'

import { SessionAnalysis } from '@/lib/advanced-analytics'
import { Card } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Play, Pause, FastForward, Clock } from 'lucide-react'

interface SessionAnalysisCardProps {
  analysis: SessionAnalysis
}

export function SessionAnalysisCard({ analysis }: SessionAnalysisCardProps) {
  const sessionStats = [
    {
      label: 'TOTAL_SESSIONS',
      value: analysis.totalSessions.toLocaleString(),
      icon: Play,
      color: 'signal-green'
    },
    {
      label: 'AVG_SESSION_LENGTH',
      value: `${analysis.avgSessionLength.toFixed(1)} videos`,
      icon: Clock,
      color: 'signal-blue'
    },
    {
      label: 'BINGE_SESSIONS',
      value: analysis.bingeSessions.toLocaleString(),
      icon: FastForward,
      color: 'signal-red'
    },
    {
      label: 'SHORT_SESSIONS',
      value: analysis.shortSessions.toLocaleString(),
      icon: Pause,
      color: 'signal-yellow'
    }
  ]

  // Prepare chart data - group hours into 4-hour blocks for better visualization
  const chartData = []
  for (let i = 0; i < 24; i += 4) {
    const blockSessions = analysis.sessionsByTimeOfDay
      .slice(i, i + 4)
      .reduce((sum, hour) => sum + hour.count, 0)
    
    chartData.push({
      timeBlock: `${String(i).padStart(2, '0')}:00-${String(i + 3).padStart(2, '0')}:59`,
      sessions: blockSessions,
      shortLabel: `${i}h`
    })
  }

  return (
    <Card className="terminal-surface border-terminal-border p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-bold text-terminal-text terminal-text mb-2">SESSION_ANALYSIS</h3>
          <p className="text-sm text-terminal-muted terminal-text">
            Viewing session patterns and behavioral clustering
          </p>
        </div>

        {/* Session Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {sessionStats.map((stat) => (
            <div key={stat.label} className="terminal-surface border-terminal-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="terminal-surface border-terminal-border rounded p-1.5">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                </div>
                <div className="text-xs text-terminal-muted terminal-text font-medium">
                  {stat.label}
                </div>
              </div>
              <div className="text-lg font-bold text-terminal-text terminal-text">
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Session Distribution Chart */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-terminal-text terminal-text">
            SESSIONS_BY_TIME_BLOCK
          </h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="shortLabel" 
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
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
                  formatter={(value: number, name: string) => [
                    `${value} sessions`, 
                    'Sessions'
                  ]}
                  labelFormatter={(label) => {
                    const item = chartData.find(d => d.shortLabel === label)
                    return item ? item.timeBlock : label
                  }}
                />
                <Bar 
                  dataKey="sessions" 
                  fill="#10B981"
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Session Insights */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-terminal-text terminal-text">
            BEHAVIORAL_PATTERNS
          </h4>
          <div className="grid grid-cols-1 gap-3 text-xs">
            <div className="flex justify-between items-center p-3 terminal-surface border-terminal-border rounded">
              <span className="text-terminal-muted terminal-text">Session Frequency</span>
              <span className="text-terminal-text terminal-text">
                {analysis.sessionsPerDay.toFixed(1)} per day
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 terminal-surface border-terminal-border rounded">
              <span className="text-terminal-muted terminal-text">Longest Session</span>
              <span className="text-terminal-text terminal-text">
                {analysis.maxSessionLength} videos
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 terminal-surface border-terminal-border rounded">
              <span className="text-terminal-muted terminal-text">Most Common Length</span>
              <span className="text-terminal-text terminal-text">
                {analysis.typicalSessionLength} videos
              </span>
            </div>
            
            <div className="flex justify-between items-center p-3 terminal-surface border-terminal-border rounded">
              <span className="text-terminal-muted terminal-text">Binge Rate</span>
              <span className="text-terminal-text terminal-text">
                {analysis.totalSessions > 0 
                  ? ((analysis.bingeSessions / analysis.totalSessions) * 100).toFixed(1)
                  : '0'
                }% of sessions
              </span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}