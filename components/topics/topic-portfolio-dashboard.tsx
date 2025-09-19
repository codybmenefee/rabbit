'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, Layers, Target, BarChart3, Zap, Brain } from 'lucide-react'
import { TopicEvolutionData, TopicDiversityMetrics } from '@/lib/topic-aggregations'

interface TopicPortfolioDashboardProps {
  data: TopicEvolutionData[]
  diversityMetrics: TopicDiversityMetrics
}

const topicIcons: Record<string, string> = {
  'Technology': '💻',
  'Finance': '💰',
  'Politics': '🏛️',
  'Entertainment': '🎬',
  'Education': '📚',
  'Gaming': '🎮',
  'Music': '🎵',
  'Sports': '⚽',
  'News': '📰',
  'Science': '🔬',
  'Cooking': '👨‍🍳',
  'Travel': '✈️',
  'Other': '📦'
}

export function TopicPortfolioDashboard({ data, diversityMetrics }: TopicPortfolioDashboardProps) {
  const topTopics = data.slice(0, 12)
  
  const getGrowthColor = (growthRate: number) => {
    if (growthRate > 20) return 'text-emerald-400'
    if (growthRate > 0) return 'text-blue-400'
    if (growthRate < -20) return 'text-red-400'
    return 'text-yellow-400'
  }

  const getGrowthIcon = (growthRate: number) => {
    if (growthRate > 5) return <TrendingUp className="w-4 h-4" />
    if (growthRate < -5) return <TrendingDown className="w-4 h-4" />
    return <Minus className="w-4 h-4" />
  }

  const getDiversityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Topics</p>
                  <p className="text-2xl font-bold text-white">{diversityMetrics.totalTopics}</p>
                </div>
                <Layers className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Diversity Index</p>
                  <p className="text-2xl font-bold text-white">{diversityMetrics.diversityIndex}</p>
                </div>
                <Target className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Balance Score</p>
                  <p className={`text-2xl font-bold ${getDiversityColor(diversityMetrics.balanceScore)}`}>
                    {diversityMetrics.balanceScore}%
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-pink-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.3 }}
        >
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Focus Level</p>
                  <p className={`text-2xl font-bold ${getDiversityColor(100 - diversityMetrics.concentrationRatio)}`}>
                    {(100 - diversityMetrics.concentrationRatio).toFixed(0)}%
                  </p>
                </div>
                <Brain className="w-8 h-8 text-indigo-400" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Content Mix Breakdown */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Content Mix Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
                <div>
                  <p className="text-sm font-medium text-blue-200">Educational</p>
                  <p className="text-xl font-bold text-white">{diversityMetrics.topicSpread.educational}%</p>
                </div>
                <div className="text-2xl">📚</div>
              </div>
              
              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
                <div>
                  <p className="text-sm font-medium text-purple-200">Entertainment</p>
                  <p className="text-xl font-bold text-white">{diversityMetrics.topicSpread.entertainment}%</p>
                </div>
                <div className="text-2xl">🎬</div>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
                <div>
                  <p className="text-sm font-medium text-emerald-200">Mixed</p>
                  <p className="text-xl font-bold text-white">{diversityMetrics.topicSpread.mixed}%</p>
                </div>
                <div className="text-2xl">🔀</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Topic Heatmap Grid */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      >
        <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
              <Layers className="w-5 h-5" />
              Topic Portfolio
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your interest distribution with growth indicators
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topTopics.map((topic, index) => (
                <motion.div
                  key={topic.topic}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                  className="relative p-4 rounded-lg border border-white/5 bg-gradient-to-br from-white/[0.02] to-white/[0.01] hover:bg-white/[0.05] transition-all hover:scale-[1.02]"
                >
                  {/* Topic Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">
                        {topicIcons[topic.topic] || '📦'}
                      </span>
                      <span className="font-semibold text-white text-sm">
                        {topic.topic}
                      </span>
                    </div>
                    <Badge 
                      variant={index < 3 ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      #{index + 1}
                    </Badge>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Videos:</span>
                      <span className="text-white font-medium">{topic.totalVideos}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Share:</span>
                      <span className="text-white font-medium">
                        {topic.averagePercentage.toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between text-sm items-center">
                      <span className="text-gray-400">Growth:</span>
                      <div className={`flex items-center gap-1 ${getGrowthColor(topic.growthRate)}`}>
                        {getGrowthIcon(topic.growthRate)}
                        <span className="font-medium">
                          {topic.growthRate > 0 ? '+' : ''}{topic.growthRate.toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Seasonality */}
                    {topic.seasonality.peak !== 'Unknown' && (
                      <div className="mt-3 p-2 rounded bg-white/5">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">Peak:</span>
                          <span className="text-emerald-400">{topic.seasonality.peak}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(topic.averagePercentage * 2, 100)}%` }}
                      transition={{ delay: index * 0.1 + 0.5, duration: 0.6 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}