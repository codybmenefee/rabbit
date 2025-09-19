'use client'

import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Award, BookOpen, Clock, Star, GraduationCap, Target } from 'lucide-react'
import { TopicQualityMetrics } from '@/lib/topic-aggregations'

interface ContentQualityMetricsProps {
  data: TopicQualityMetrics[]
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

const qualityColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981']

export function ContentQualityMetrics({ data }: ContentQualityMetricsProps) {
  const topTopics = data.slice(0, 8)
  
  // Calculate overall quality insights
  const overallMetrics = calculateOverallMetrics(data)
  
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400'
    if (score >= 60) return 'text-blue-400'
    if (score >= 40) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getQualityGrade = (score: number) => {
    if (score >= 90) return 'A+'
    if (score >= 80) return 'A'
    if (score >= 70) return 'B+'
    if (score >= 60) return 'B'
    if (score >= 50) return 'C+'
    if (score >= 40) return 'C'
    return 'D'
  }

  const getBarColor = (score: number) => {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#3b82f6'
    if (score >= 40) return '#eab308'
    return '#ef4444'
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
            <Award className="w-5 h-5" />
            Content Quality Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Educational value and content depth metrics by topic
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Quality Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-200">Educational Content</p>
                  <p className="text-2xl font-bold text-white">{overallMetrics.educationalPercentage.toFixed(0)}%</p>
                </div>
                <BookOpen className="w-8 h-8 text-emerald-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Long-Form Content</p>
                  <p className="text-2xl font-bold text-white">{overallMetrics.longFormPercentage.toFixed(0)}%</p>
                </div>
                <Clock className="w-8 h-8 text-blue-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-200">Overall Quality</p>
                  <p className={`text-2xl font-bold ${getQualityColor(overallMetrics.averageQuality)}`}>
                    {getQualityGrade(overallMetrics.averageQuality)}
                  </p>
                </div>
                <Star className="w-8 h-8 text-purple-400" />
              </div>
            </motion.div>
          </div>

          {/* Quality Score Chart */}
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTopics} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                <XAxis 
                  dataKey="topic" 
                  stroke="#9ca3af" 
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  stroke="#9ca3af" 
                  fontSize={12}
                  domain={[0, 100]}
                  label={{ value: 'Quality Score', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number, name: string) => [
                    `${value}/100 (${getQualityGrade(value)})`,
                    'Quality Score'
                  ]}
                />
                <Bar dataKey="qualityScore" radius={[4, 4, 0, 0]}>
                  {topTopics.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getBarColor(entry.qualityScore)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed Topic Breakdown */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap className="w-5 h-5 text-white" />
              <h4 className="text-lg font-semibold text-white">Topic Quality Breakdown</h4>
            </div>
            
            {topTopics.map((topic, index) => (
              <motion.div
                key={topic.topic}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
                className="p-4 rounded-lg border border-white/5 bg-gradient-to-r from-white/[0.02] to-white/[0.01] hover:bg-white/[0.05] transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {topicIcons[topic.topic] || '📦'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{topic.topic}</span>
                        <Badge 
                          variant={topic.qualityScore >= 70 ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {getQualityGrade(topic.qualityScore)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {topic.totalVideos} videos • {topic.educationalPercentage.toFixed(0)}% educational
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className={`font-bold ${getQualityColor(topic.qualityScore)}`}>
                        {topic.qualityScore}
                      </div>
                      <div className="text-gray-400 text-xs">Quality</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-bold text-emerald-400">
                        {topic.educationalPercentage.toFixed(0)}%
                      </div>
                      <div className="text-gray-400 text-xs">Educational</div>
                    </div>

                    <div className="text-center">
                      <div className="font-bold text-blue-400">
                        {topic.longFormPercentage.toFixed(0)}%
                      </div>
                      <div className="text-gray-400 text-xs">Long-form</div>
                    </div>

                    <div className="text-center">
                      <div className="font-bold text-purple-400">
                        {topic.avgEngagementIndicator.toFixed(0)}
                      </div>
                      <div className="text-gray-400 text-xs">Engagement</div>
                    </div>
                  </div>
                </div>

                {/* Quality Progress Bar */}
                <div className="mt-3 w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: getBarColor(topic.qualityScore) }}
                    initial={{ width: 0 }}
                    animate={{ width: `${topic.qualityScore}%` }}
                    transition={{ delay: index * 0.1 + 0.5, duration: 0.6 }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Quality Insights */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-200">Highest Quality Topic</span>
              </div>
              <div className="text-lg font-bold text-white">{overallMetrics.bestQualityTopic}</div>
              <div className="text-xs text-gray-400">
                Consistently high educational value
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-200">Learning Focus</span>
              </div>
              <div className="text-lg font-bold text-white">
                {overallMetrics.educationalPercentage > 60 ? 'High' : 
                 overallMetrics.educationalPercentage > 30 ? 'Medium' : 'Low'}
              </div>
              <div className="text-xs text-gray-400">
                Educational content consumption
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Helper function to calculate overall metrics
function calculateOverallMetrics(data: TopicQualityMetrics[]) {
  if (data.length === 0) {
    return {
      educationalPercentage: 0,
      longFormPercentage: 0,
      averageQuality: 0,
      bestQualityTopic: 'N/A'
    }
  }

  const totalVideos = data.reduce((sum, topic) => sum + topic.totalVideos, 0)
  const totalEducational = data.reduce((sum, topic) => 
    sum + (topic.educationalPercentage * topic.totalVideos / 100), 0)
  const totalLongForm = data.reduce((sum, topic) => 
    sum + (topic.longFormPercentage * topic.totalVideos / 100), 0)
  
  const weightedQualitySum = data.reduce((sum, topic) => 
    sum + (topic.qualityScore * topic.totalVideos), 0)
  
  const bestQualityTopic = data.reduce((best, current) => 
    current.qualityScore > best.qualityScore ? current : best
  )

  return {
    educationalPercentage: (totalEducational / totalVideos) * 100,
    longFormPercentage: (totalLongForm / totalVideos) * 100,
    averageQuality: weightedQualitySum / totalVideos,
    bestQualityTopic: bestQualityTopic.topic
  }
}