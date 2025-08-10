'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, Download, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MainDashboard, generateSampleData } from '@/components/dashboard/main-dashboard'
import { WatchRecord } from '@/types/records'

export default function DashboardDemo() {
  const [data, setData] = useState<WatchRecord[]>(() => generateSampleData())
  const [isGenerating, setIsGenerating] = useState(false)

  const regenerateData = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setData(generateSampleData())
      setIsGenerating(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => window.history.back()}
              className="text-muted-foreground hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                YouTube Analytics Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive insights from your viewing history
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="text-xs">
              Demo Mode
            </Badge>
            <Badge variant="outline" className="text-xs">
              {data.length.toLocaleString()} records
            </Badge>
            
            <Button
              variant="outline"
              size="sm"
              onClick={regenerateData}
              disabled={isGenerating}
              className="text-xs"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'New Data'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              <Share2 className="w-3 h-3 mr-1" />
              Share
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              <Download className="w-3 h-3 mr-1" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Data Overview Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-6"
        >
          <Card className="border-white/5 bg-black/40 backdrop-blur-xl">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
                <span role="img" aria-label="Chart">📊</span> Data Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Total Records:</span>
                  <div className="font-semibold text-white">{data.length.toLocaleString()}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Date Range:</span>
                  <div className="font-semibold text-white">Jan 2023 - Aug 2024</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Channels:</span>
                  <div className="font-semibold text-white">
                    {new Set(data.map(d => d.channelTitle).filter(Boolean)).size}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Topics:</span>
                  <div className="font-semibold text-white">
                    {new Set(data.flatMap(d => d.topics)).size}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Dashboard */}
        <MainDashboard data={data} />

        {/* Footer */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 1.0 }}
          className="mt-12 pt-8 border-t border-white/10 text-center text-sm text-muted-foreground"
        >
          <p>
            This is a demonstration of Agent D&apos;s dashboard components. 
            All data shown is synthetic and generated for testing purposes.
          </p>
          <p className="mt-2">
            Built with Next.js, TypeScript, Tailwind CSS, Recharts, and Framer Motion.
          </p>
        </motion.div>
      </div>
    </div>
  )
}