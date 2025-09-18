'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Activity, Video, Users, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatNumber, formatDuration } from '@/lib/utils'
import { KPIMetrics } from '@/types/records'

interface KPICardsProps {
  metrics: KPIMetrics
}

export function KPICards({ metrics }: KPICardsProps) {
  const cards = [
    {
      title: 'YTD_VIDEOS',
      value: metrics.ytdVideos,
      change: metrics.ytdYoyDelta,
      period: 'vs_last_year',
      icon: Video,
      signalColor: 'signal-green',
      description: 'YEAR_TO_DATE'
    },
    {
      title: 'QTD_VIDEOS',
      value: metrics.qtdVideos,
      change: metrics.qtdYoyDelta,
      period: 'vs_last_year',
      icon: Activity,
      signalColor: 'signal-orange',
      description: 'QUARTER_TO_DATE'
    },
    {
      title: 'MTD_VIDEOS',
      value: metrics.mtdVideos,
      change: metrics.mtdYoyDelta,
      period: 'vs_last_year',
      icon: Clock,
      signalColor: 'signal-green',
      description: 'MONTH_TO_DATE'
    },
    {
      title: 'UNIQUE_CHANNELS',
      value: metrics.uniqueChannels,
      change: 0,
      period: 'total',
      icon: Users,
      signalColor: 'signal-red',
      description: 'ALL_TIME_TOTAL'
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: index * 0.05, duration: 0.3 }}
          whileHover={{ y: -2, transition: { duration: 0.2 } }}
        >
          <Card className="relative overflow-hidden">
            <div className={`absolute inset-0 bg-terminal-surface opacity-20`} />
            
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-terminal-muted terminal-text uppercase tracking-wider">
                    {card.description}
                  </p>
                  <CardTitle className={`text-lg font-semibold terminal-text mt-1 ${card.signalColor}`}>
                    {card.title}
                  </CardTitle>
                </div>
                <div className="p-2 rounded-md terminal-surface border border-terminal-border">
                  <card.icon className={`h-5 w-5 ${card.signalColor}`} />
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative">
              <motion.div
                key={card.value}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold text-terminal-text data-metric"
              >
                {formatNumber(card.value)}
              </motion.div>

              {card.change !== 0 && (
                <div className="mt-3 flex items-center text-xs terminal-text">
                  {card.change >= 0 ? (
                    <>
                      <TrendingUp className="mr-1 h-3 w-3 signal-green" />
                      <span className="signal-green font-medium">
                        +{Math.abs(card.change).toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="mr-1 h-3 w-3 signal-red" />
                      <span className="signal-red font-medium">
                        {card.change.toFixed(1)}%
                      </span>
                    </>
                  )}
                  <span className="ml-1 text-terminal-muted uppercase">{card.period}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

export function KPISummaryCard({ metrics }: { metrics: KPIMetrics }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-terminal-text terminal-text">
            PERFORMANCE_SUMMARY
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-terminal-muted terminal-text">TOTAL_VIDEOS</p>
              <p className="text-2xl font-bold text-terminal-text data-metric">
                {formatNumber(metrics.totalVideos)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-terminal-muted terminal-text">WATCH_TIME</p>
              <p className="text-2xl font-bold text-terminal-text data-metric">
                {formatDuration(metrics.totalWatchTime)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-terminal-muted terminal-text">CHANNELS</p>
              <p className="text-2xl font-bold text-terminal-text data-metric">
                {metrics.uniqueChannels}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-terminal-border">
            <div className="flex items-center justify-between text-sm terminal-text">
              <span className="text-terminal-muted">YOY_GROWTH</span>
              <div className="flex items-center gap-4">
                <span className={metrics.ytdYoyDelta >= 0 ? 'signal-green' : 'signal-red'}>
                  YTD: {metrics.ytdYoyDelta >= 0 ? '+' : ''}{metrics.ytdYoyDelta.toFixed(1)}%
                </span>
                <span className={metrics.qtdYoyDelta >= 0 ? 'signal-green' : 'signal-red'}>
                  QTD: {metrics.qtdYoyDelta >= 0 ? '+' : ''}{metrics.qtdYoyDelta.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}