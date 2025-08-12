'use client'

import { motion } from 'framer-motion'
import { AdvancedKPIMetrics } from '@/lib/advanced-analytics'
import { Card } from '@/components/ui/card'
import { 
  BarChart3, 
  Users, 
  Clock, 
  Target,
  TrendingUp,
  Activity,
  Brain,
  Zap,
  Calendar,
  Award
} from 'lucide-react'

interface AdvancedKPICardsProps {
  metrics: AdvancedKPIMetrics
}

interface KPICardData {
  title: string
  value: string | number
  subtitle: string
  icon: React.ComponentType<any>
  color: string
  trend?: {
    value: number
    label: string
  }
}

export function AdvancedKPICards({ metrics }: AdvancedKPICardsProps) {
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  }

  const formatGrowth = (rate: number) => {
    const sign = rate >= 0 ? '+' : ''
    return `${sign}${rate}%`
  }

  const kpiCards: KPICardData[] = [
    {
      title: 'TOTAL_CONSUMPTION',
      value: metrics.totalVideos.toLocaleString(),
      subtitle: `${formatTime(metrics.estimatedWatchTime)} estimated`,
      icon: BarChart3,
      color: 'signal-green',
      trend: {
        value: metrics.monthlyGrowthRate,
        label: 'MoM'
      }
    },
    {
      title: 'CREATOR_NETWORK',
      value: metrics.uniqueChannels.toLocaleString(),
      subtitle: `${metrics.repeatChannelRate.toFixed(1)}% repeat rate`,
      icon: Users,
      color: 'signal-blue',
    },
    {
      title: 'DAILY_AVERAGE',
      value: metrics.avgVideosPerDay.toFixed(1),
      subtitle: 'videos per day',
      icon: Calendar,
      color: 'signal-purple',
    },
    {
      title: 'SESSION_LENGTH',
      value: metrics.avgSessionLength.toFixed(1),
      subtitle: 'videos per session',
      icon: Clock,
      color: 'signal-cyan',
    },
    {
      title: 'CONTENT_DIVERSITY',
      value: `${metrics.contentDiversityIndex.toFixed(1)}%`,
      subtitle: 'topic coverage index',
      icon: Brain,
      color: 'signal-pink',
    },
    {
      title: 'DISCOVERY_RATE',
      value: metrics.discoveryRate.toFixed(1),
      subtitle: 'new channels/month',
      icon: Target,
      color: 'signal-orange',
    },
    {
      title: 'BINGE_SESSIONS',
      value: metrics.bingeSessionCount.toLocaleString(),
      subtitle: '5+ videos in sequence',
      icon: Zap,
      color: 'signal-red',
    },
    {
      title: 'CONSISTENCY_SCORE',
      value: `${metrics.viewingConsistencyScore.toFixed(0)}/100`,
      subtitle: 'viewing regularity',
      icon: Activity,
      color: 'signal-yellow',
    },
    {
      title: 'EDUCATIONAL_RATIO',
      value: `${metrics.educationalContentRatio.toFixed(1)}%`,
      subtitle: 'learning content',
      icon: Award,
      color: 'signal-green',
    },
    {
      title: 'PEAK_ACTIVITY',
      value: `${metrics.peakActivityWindow.start}:00-${metrics.peakActivityWindow.end}:00`,
      subtitle: 'primary viewing window',
      icon: TrendingUp,
      color: 'signal-blue',
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-terminal-text terminal-text mb-2">ADVANCED_METRICS</h2>
        <p className="text-sm text-terminal-muted terminal-text">
          Deep statistical analysis of consumption patterns and behavioral insights
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map((card, index) => (
          <motion.div
            key={card.title}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          >
            <Card className="terminal-surface border-terminal-border p-4 hover:scale-105 transition-transform duration-200">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg terminal-surface border-terminal-border`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
                {card.trend && (
                  <div className={`text-xs px-2 py-1 rounded terminal-surface ${
                    card.trend.value >= 0 ? 'text-signal-green-400' : 'text-signal-red-400'
                  }`}>
                    {formatGrowth(card.trend.value)} {card.trend.label}
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                <h3 className="text-xs font-medium text-terminal-muted terminal-text">
                  {card.title}
                </h3>
                <p className="text-lg font-bold text-terminal-text terminal-text">
                  {card.value}
                </p>
                <p className="text-xs text-terminal-muted terminal-text">
                  {card.subtitle}
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Key Insights Summary */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.5 }}
      >
        <Card className="terminal-surface border-terminal-border p-6">
          <h3 className="text-lg font-bold text-terminal-text terminal-text mb-4">BEHAVIORAL_INSIGHTS</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="text-terminal-muted terminal-text">Content Balance</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  metrics.educationalContentRatio > 30 ? 'bg-signal-green-500' : 'bg-signal-orange-500'
                }`} />
                <span className="text-terminal-text terminal-text">
                  {metrics.educationalContentRatio > 30 ? 'Education-focused' : 'Entertainment-focused'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-terminal-muted terminal-text">Viewing Style</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  metrics.avgSessionLength > 3 ? 'bg-signal-red-500' : 'bg-signal-green-500'
                }`} />
                <span className="text-terminal-text terminal-text">
                  {metrics.avgSessionLength > 3 ? 'Binge watcher' : 'Casual viewer'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="text-terminal-muted terminal-text">Discovery Pattern</div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  metrics.discoveryRate > 2 ? 'bg-signal-green-500' : 'bg-signal-blue-500'
                }`} />
                <span className="text-terminal-text terminal-text">
                  {metrics.discoveryRate > 2 ? 'Explorer' : 'Loyalist'}
                </span>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    </div>
  )
}