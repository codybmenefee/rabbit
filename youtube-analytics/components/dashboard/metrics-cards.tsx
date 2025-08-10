'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Clock, Play, Users, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { formatNumber, formatDuration, formatPercentage } from '@/lib/utils'
import { DashboardMetrics } from '@/types'

interface MetricsCardsProps {
  metrics: DashboardMetrics
}

export function MetricsCards({ metrics }: MetricsCardsProps) {
  const cards = [
    {
      title: 'Total Watch Time',
      value: formatDuration(metrics.totalWatchTime),
      change: metrics.previousPeriodComparison.watchTime,
      icon: Clock,
      color: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'Videos Watched',
      value: formatNumber(metrics.videosWatched),
      change: metrics.previousPeriodComparison.videos,
      icon: Play,
      color: 'from-purple-500 to-pink-500'
    },
    {
      title: 'Unique Channels',
      value: formatNumber(metrics.uniqueChannels),
      change: metrics.previousPeriodComparison.channels,
      icon: Users,
      color: 'from-emerald-500 to-teal-500'
    },
    {
      title: 'Avg Session',
      value: formatDuration(metrics.averageSessionLength),
      change: 15.2,
      icon: Zap,
      color: 'from-orange-500 to-red-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          whileHover={{ y: -5, transition: { duration: 0.2 } }}
        >
          <Card className="relative overflow-hidden border-white/10">
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-10`} />
            
            <CardContent className="relative p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {card.title}
                  </p>
                  <motion.p
                    key={card.value}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-2xl font-bold text-foreground mt-1"
                  >
                    {card.value}
                  </motion.p>
                </div>
                <div className={`p-3 rounded-lg bg-gradient-to-br ${card.color}`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>

              {/* Change indicator */}
              <div className="mt-4 flex items-center text-sm">
                {card.change >= 0 ? (
                  <TrendingUp className="mr-1 h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="mr-1 h-4 w-4 text-red-500" />
                )}
                <span className={card.change >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                  {Math.abs(card.change)}%
                </span>
                <span className="ml-1 text-muted-foreground">vs last period</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}