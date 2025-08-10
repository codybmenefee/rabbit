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
      title: 'YTD Videos',
      value: metrics.ytdVideos,
      change: metrics.ytdYoyDelta,
      period: 'vs Last Year',
      icon: Video,
      gradient: 'from-blue-500 to-cyan-500',
      description: 'Year to Date'
    },
    {
      title: 'QTD Videos',
      value: metrics.qtdVideos,
      change: metrics.qtdYoyDelta,
      period: 'vs Last Year',
      icon: Activity,
      gradient: 'from-purple-500 to-pink-500',
      description: 'Quarter to Date'
    },
    {
      title: 'MTD Videos',
      value: metrics.mtdVideos,
      change: metrics.mtdYoyDelta,
      period: 'vs Last Year',
      icon: Clock,
      gradient: 'from-emerald-500 to-teal-500',
      description: 'Month to Date'
    },
    {
      title: 'Unique Channels',
      value: metrics.uniqueChannels,
      change: 0,
      period: 'Total',
      icon: Users,
      gradient: 'from-orange-500 to-red-500',
      description: 'Across all time'
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
          <Card className="relative overflow-hidden border-white/5 bg-black/40 backdrop-blur-xl">
            <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-5`} />
            
            <CardHeader className="relative pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {card.description}
                  </p>
                  <CardTitle className="text-lg font-semibold text-white mt-1">
                    {card.title}
                  </CardTitle>
                </div>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient} bg-opacity-10`}>
                  <card.icon className="h-5 w-5 text-white opacity-80" />
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative">
              <motion.div
                key={card.value}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-3xl font-bold text-white"
              >
                {formatNumber(card.value)}
              </motion.div>

              {card.change !== 0 && (
                <div className="mt-3 flex items-center text-xs">
                  {card.change >= 0 ? (
                    <>
                      <TrendingUp className="mr-1 h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">
                        +{Math.abs(card.change).toFixed(1)}%
                      </span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="mr-1 h-3 w-3 text-red-400" />
                      <span className="text-red-400 font-medium">
                        {card.change.toFixed(1)}%
                      </span>
                    </>
                  )}
                  <span className="ml-1 text-muted-foreground">{card.period}</span>
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
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white">
            Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Total Videos</p>
              <p className="text-2xl font-bold text-white">
                {formatNumber(metrics.totalVideos)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Watch Time</p>
              <p className="text-2xl font-bold text-white">
                {formatDuration(metrics.totalWatchTime)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Channels</p>
              <p className="text-2xl font-bold text-white">
                {metrics.uniqueChannels}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">YOY Growth</span>
              <div className="flex items-center gap-4">
                <span className={metrics.ytdYoyDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  YTD: {metrics.ytdYoyDelta >= 0 ? '+' : ''}{metrics.ytdYoyDelta.toFixed(1)}%
                </span>
                <span className={metrics.qtdYoyDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}>
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