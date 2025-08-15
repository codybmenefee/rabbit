'use client'

import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, RadialBarChart, RadialBar, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Zap, Eye, Shield, Network, Cpu } from 'lucide-react'
import { TopicRecommendationImpact } from '@/lib/topic-aggregations'

interface RecommendationImpactAnalysisProps {
  data: TopicRecommendationImpact[]
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

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899']

export function RecommendationImpactAnalysis({ data }: RecommendationImpactAnalysisProps) {
  const topTopics = data.slice(0, 8)
  
  // Calculate overall algorithm influence
  const overallInfluence = calculateOverallInfluence(data)
  
  // Prepare data for pie chart
  const pieData = topTopics.map((topic, index) => ({
    name: topic.topic,
    recommended: topic.recommendedPercentage,
    intentional: topic.intentionalPercentage,
    color: COLORS[index % COLORS.length]
  }))

  // Prepare data for bubble risk chart
  const bubbleRiskData = topTopics.map((topic, index) => ({
    topic: topic.topic,
    bubbleRisk: topic.bubbleRisk,
    diversity: topic.diversityFromTopic,
    fill: COLORS[index % COLORS.length]
  }))

  const getInfluenceColor = (influence: 'high' | 'medium' | 'low') => {
    switch (influence) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-yellow-400'
      case 'low': return 'text-emerald-400'
      default: return 'text-gray-400'
    }
  }

  const getInfluenceIcon = (influence: 'high' | 'medium' | 'low') => {
    switch (influence) {
      case 'high': return <AlertTriangle className="w-4 h-4" />
      case 'medium': return <Eye className="w-4 h-4" />
      case 'low': return <Shield className="w-4 h-4" />
      default: return <Cpu className="w-4 h-4" />
    }
  }

  const getBubbleRiskColor = (risk: number) => {
    if (risk >= 70) return 'text-red-400'
    if (risk >= 40) return 'text-yellow-400'
    return 'text-emerald-400'
  }

  const getBubbleRiskLabel = (risk: number) => {
    if (risk >= 70) return 'High Risk'
    if (risk >= 40) return 'Medium Risk'
    return 'Low Risk'
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
            <Cpu className="w-5 h-5" />
            Cpu Impact Analysis
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            How recommendations influence your content consumption
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Overall Cpu Influence */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="p-4 rounded-lg bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-200">Cpu Influence</p>
                  <p className={`text-2xl font-bold ${getInfluenceColor(overallInfluence.level)}`}>
                    {overallInfluence.level.toUpperCase()}
                  </p>
                </div>
                <Zap className="w-8 h-8 text-purple-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-200">Echo Chamber Risk</p>
                  <p className={`text-2xl font-bold ${getBubbleRiskColor(overallInfluence.averageBubbleRisk)}`}>
                    {getBubbleRiskLabel(overallInfluence.averageBubbleRisk)}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </motion.div>

            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="p-4 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-200">Intentional Viewing</p>
                  <p className="text-2xl font-bold text-white">{overallInfluence.intentionalPercentage.toFixed(0)}%</p>
                </div>
                <Eye className="w-8 h-8 text-emerald-400" />
              </div>
            </motion.div>
          </div>

          {/* Recommendation vs Intentional Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                <Network className="w-5 h-5" />
                Content Discovery Patterns
              </h4>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Recommended', value: overallInfluence.recommendedPercentage, fill: '#ef4444' },
                        { name: 'Intentional', value: overallInfluence.intentionalPercentage, fill: '#10b981' }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#ef4444" />
                      <Cell fill="#10b981" />
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number) => [`${value.toFixed(0)}%`, '']}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bubble Risk Visualization */}
            <div className="space-y-4">
              <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Echo Chamber Risk by Topic
              </h4>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="20%" 
                    outerRadius="80%" 
                    data={bubbleRiskData.slice(0, 5)}
                  >
                    <RadialBar dataKey="bubbleRisk" cornerRadius={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: number, name: string, props: any) => [
                        `${value.toFixed(0)}% risk`,
                        props.payload.topic
                      ]}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Topic Breakdown */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5" />
              Cpu Impact by Topic
            </h4>
            
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
                          variant={topic.algorithmInfluence === 'high' ? 'destructive' : 
                                  topic.algorithmInfluence === 'medium' ? 'default' : 'secondary'}
                          className="flex items-center gap-1 text-xs"
                        >
                          {getInfluenceIcon(topic.algorithmInfluence)}
                          {topic.algorithmInfluence} influence
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-400 mt-1">
                        {topic.diversityFromTopic} connected topics • {getBubbleRiskLabel(topic.bubbleRisk)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-red-400">
                        {topic.recommendedPercentage.toFixed(0)}%
                      </div>
                      <div className="text-gray-400 text-xs">Recommended</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-bold text-emerald-400">
                        {topic.intentionalPercentage.toFixed(0)}%
                      </div>
                      <div className="text-gray-400 text-xs">Intentional</div>
                    </div>

                    <div className="text-center">
                      <div className={`font-bold ${getBubbleRiskColor(topic.bubbleRisk)}`}>
                        {topic.bubbleRisk.toFixed(0)}%
                      </div>
                      <div className="text-gray-400 text-xs">Echo Risk</div>
                    </div>

                    <div className="text-center">
                      <div className="font-bold text-blue-400">
                        {topic.diversityFromTopic}
                      </div>
                      <div className="text-gray-400 text-xs">Diversity</div>
                    </div>
                  </div>
                </div>

                {/* Cpu Influence Progress Bar */}
                <div className="mt-3 flex gap-1">
                  <div 
                    className="h-2 bg-red-400 rounded-l-full"
                    style={{ width: `${topic.recommendedPercentage}%` }}
                  />
                  <div 
                    className="h-2 bg-emerald-400 rounded-r-full"
                    style={{ width: `${topic.intentionalPercentage}%` }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Recommendations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-200">Recommendation</span>
              </div>
              <div className="text-sm text-white">
                {overallInfluence.recommendedPercentage > 70 
                  ? "Consider diversifying your viewing with more intentional content searches"
                  : overallInfluence.averageBubbleRisk > 60
                  ? "Explore topics outside your usual preferences to avoid echo chambers"
                  : "Good balance between recommended and intentional content consumption"}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Eye className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-200">Most Diverse Topic</span>
              </div>
              <div className="text-lg font-bold text-white">
                {data.reduce((prev, current) => 
                  current.diversityFromTopic > prev.diversityFromTopic ? current : prev
                ).topic}
              </div>
              <div className="text-xs text-gray-400">
                Best cross-topic connections
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

// Helper function to calculate overall algorithm influence
function calculateOverallInfluence(data: TopicRecommendationImpact[]) {
  if (data.length === 0) {
    return {
      level: 'low' as const,
      recommendedPercentage: 0,
      intentionalPercentage: 0,
      averageBubbleRisk: 0
    }
  }

  const totalRecommended = data.reduce((sum, topic) => sum + topic.recommendedPercentage, 0)
  const totalIntentional = data.reduce((sum, topic) => sum + topic.intentionalPercentage, 0)
  const totalBubbleRisk = data.reduce((sum, topic) => sum + topic.bubbleRisk, 0)

  const avgRecommended = totalRecommended / data.length
  const avgIntentional = totalIntentional / data.length
  const avgBubbleRisk = totalBubbleRisk / data.length

  const level = avgRecommended > 70 ? 'high' : avgRecommended > 40 ? 'medium' : 'low'

  return {
    level,
    recommendedPercentage: avgRecommended,
    intentionalPercentage: avgIntentional,
    averageBubbleRisk: avgBubbleRisk
  }
}