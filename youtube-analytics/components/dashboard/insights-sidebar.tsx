'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Brain, Target, Zap, ArrowRight } from 'lucide-react'
import { InsightCard } from '@/types'
import { Button } from '@/components/ui/button'

interface InsightsSidebarProps {
  insights: InsightCard[]
}

const impactColors = {
  high: 'from-red-500 to-pink-500',
  medium: 'from-orange-500 to-yellow-500', 
  low: 'from-blue-500 to-cyan-500'
}

const typeIcons = {
  trend: TrendingUp,
  correlation: Brain,
  pattern: Target,
  discovery: Zap
}

export function InsightsSidebar({ insights }: InsightsSidebarProps) {
  return (
    <Card className="h-fit">
      <CardHeader>
        <CardTitle className="gradient-text flex items-center">
          <Brain className="mr-2 h-5 w-5" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {insights.map((insight, index) => {
          const Icon = typeIcons[insight.type]
          return (
            <motion.div
              key={insight.id}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.02 }}
              className="group cursor-pointer"
            >
              <div className="glass-card p-4 border border-white/10 hover:border-primary/30 transition-all duration-300">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg bg-gradient-to-r ${impactColors[insight.impact]} bg-opacity-20`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-foreground">
                      {insight.metric.value}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {insight.metric.label}
                      </span>
                    </p>
                    {insight.metric.change !== 0 && (
                      <p className={`text-xs ${insight.metric.change > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {insight.metric.change > 0 ? '+' : ''}{insight.metric.change}%
                      </p>
                    )}
                  </div>
                </div>

                {/* Content */}
                <h4 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {insight.title}
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {insight.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {insight.timeframe}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all duration-300" />
                </div>

                {/* Impact indicator */}
                <div className="mt-3 h-1 w-full bg-background/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: insight.impact === 'high' ? '100%' : insight.impact === 'medium' ? '60%' : '30%' }}
                    transition={{ delay: (index * 0.1) + 0.3, duration: 0.8, ease: 'easeOut' }}
                    className={`h-full bg-gradient-to-r ${impactColors[insight.impact]} rounded-full`}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}

        {/* View All Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: insights.length * 0.1 + 0.2 }}
        >
          <Button 
            variant="outline" 
            className="w-full mt-4 border-primary/20 hover:border-primary/50 hover:bg-primary/10"
          >
            View All Insights
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </CardContent>
    </Card>
  )
}