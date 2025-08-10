'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, Crown, Medal, Award, Tag } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPercentage } from '@/lib/utils'
import { TopicCount } from '@/types/records'

interface TopicsLeaderboardProps {
  data: TopicCount[]
  title?: string
  limit?: number
}

const topicIcons = {
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

const rankIcons = [
  <Crown className="w-4 h-4 text-yellow-400" key="1" />,
  <Medal className="w-4 h-4 text-gray-300" key="2" />,
  <Award className="w-4 h-4 text-amber-600" key="3" />
]

export function TopicsLeaderboard({ 
  data, 
  title = 'Content Topics',
  limit = 8 
}: TopicsLeaderboardProps) {
  const topTopics = data.slice(0, limit)

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 text-emerald-400" />
      case 'down':
        return <TrendingDown className="w-3 h-3 text-red-400" />
      default:
        return <Minus className="w-3 h-3 text-muted-foreground" />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-emerald-400'
      case 'down':
        return 'text-red-400'
      default:
        return 'text-muted-foreground'
    }
  }

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-white flex items-center gap-2">
            <Tag className="w-5 h-5" />
            {title}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your most watched content categories
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {topTopics.map((topic, index) => (
            <motion.div
              key={topic.topic}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              className="flex items-center justify-between p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                {/* Rank indicator */}
                <div className="flex-shrink-0 w-6 flex justify-center">
                  {index < 3 ? (
                    rankIcons[index]
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                  )}
                </div>

                {/* Topic info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {topicIcons[topic.topic as keyof typeof topicIcons] || '📦'}
                    </span>
                    <span className="font-medium text-white">
                      {topic.topic}
                    </span>
                    <Badge 
                      variant={index === 0 ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
                      {formatPercentage(topic.percentage, 1)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-sm font-medium text-muted-foreground">
                      {topic.count} videos
                    </span>
                    
                    <div className={`flex items-center space-x-1 text-xs ${getTrendColor(topic.trend)}`}>
                      {getTrendIcon(topic.trend)}
                      <span>
                        {topic.trend === 'up' && 'Trending'}
                        {topic.trend === 'down' && 'Declining'}
                        {topic.trend === 'stable' && 'Stable'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-20 h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(topic.percentage, 100)}%` }}
                  transition={{ delay: index * 0.1 + 0.5, duration: 0.5 }}
                />
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  )
}

export function CompactTopicsList({ 
  data, 
  title = 'Top Topics',
  limit = 6 
}: TopicsLeaderboardProps) {
  const topTopics = data.slice(0, limit)

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
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {topTopics.map((topic, index) => (
              <motion.div
                key={topic.topic}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
              >
                <Badge 
                  variant={index < 3 ? 'default' : 'secondary'}
                  className="flex items-center gap-1 text-sm py-1 px-3"
                >
                  <span>
                    {topicIcons[topic.topic as keyof typeof topicIcons] || '📦'}
                  </span>
                  {topic.topic}
                  <span className="text-xs opacity-75">
                    {topic.count}
                  </span>
                  {getTrendIcon(topic.trend)}
                </Badge>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )

  function getTrendIcon(trend: 'up' | 'down' | 'stable') {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-3 h-3 ml-1" />
      case 'down':
        return <TrendingDown className="w-3 h-3 ml-1" />
      default:
        return null
    }
  }
}