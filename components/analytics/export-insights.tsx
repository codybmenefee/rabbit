'use client'

import { useState } from 'react'
import { WatchRecord } from '@/lib/types'
import { AdvancedKPIMetrics, SessionAnalysis, ViewingPattern } from '@/lib/advanced-analytics'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  FileText, 
  BarChart3, 
  Brain, 
  CheckCircle,
  AlertCircle,
  Lightbulb
} from 'lucide-react'

interface ExportInsightsProps {
  data: WatchRecord[]
  analytics: {
    advancedKPIs: AdvancedKPIMetrics
    sessionAnalysis: SessionAnalysis
    viewingPatterns: ViewingPattern[]
  }
}

interface AutomatedInsight {
  type: 'positive' | 'neutral' | 'negative'
  category: 'consumption' | 'discovery' | 'behavior' | 'content'
  title: string
  description: string
  recommendation?: string
}

export function ExportInsights({ data, analytics }: ExportInsightsProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null)

  // Generate automated insights
  const generateAutomatedInsights = (): AutomatedInsight[] => {
    const insights: AutomatedInsight[] = []
    const kpis = analytics.advancedKPIs
    const sessions = analytics.sessionAnalysis
    const patterns = analytics.viewingPatterns

    // Content balance insight
    if (kpis.educationalContentRatio > 40) {
      insights.push({
        type: 'positive',
        category: 'content',
        title: 'High Educational Content Ratio',
        description: `${kpis.educationalContentRatio.toFixed(1)}% of your viewing is educational content, well above average.`,
        recommendation: 'Consider sharing your favorite educational channels with others who might benefit.'
      })
    } else if (kpis.educationalContentRatio < 15) {
      insights.push({
        type: 'neutral',
        category: 'content',
        title: 'Entertainment-Focused Viewing',
        description: `${kpis.educationalContentRatio.toFixed(1)}% educational content suggests you prefer entertainment.`,
        recommendation: 'Consider adding one educational channel to your routine for balanced consumption.'
      })
    }

    // Discovery pattern insight
    if (kpis.discoveryRate > 3) {
      insights.push({
        type: 'positive',
        category: 'discovery',
        title: 'Active Content Explorer',
        description: `You discover ${kpis.discoveryRate.toFixed(1)} new channels per month, showing strong curiosity.`,
        recommendation: 'Your exploration habits are excellent for discovering diverse perspectives.'
      })
    } else if (kpis.discoveryRate < 1) {
      insights.push({
        type: 'neutral',
        category: 'discovery',
        title: 'Channel Loyalist Pattern',
        description: `Low discovery rate of ${kpis.discoveryRate.toFixed(1)} suggests you prefer familiar creators.`,
        recommendation: 'Try setting a goal to explore 1-2 new channels monthly to expand your interests.'
      })
    }

    // Binge behavior insight
    if (sessions.bingeSessions > sessions.totalSessions * 0.3) {
      insights.push({
        type: 'negative',
        category: 'behavior',
        title: 'High Binge-Watching Pattern',
        description: `${((sessions.bingeSessions / sessions.totalSessions) * 100).toFixed(1)}% of your sessions are binge sessions (5+ videos).`,
        recommendation: 'Consider setting viewing time limits or taking breaks between videos for healthier habits.'
      })
    }

    // Consistency insight
    if (kpis.viewingConsistencyScore > 75) {
      insights.push({
        type: 'positive',
        category: 'behavior',
        title: 'Consistent Viewing Pattern',
        description: `High consistency score of ${kpis.viewingConsistencyScore.toFixed(0)} indicates well-regulated viewing habits.`,
        recommendation: 'Your balanced approach to content consumption is commendable.'
      })
    }

    // Time pattern insights
    const hasNightOwlPattern = patterns.find(p => p.type === 'night_owl')
    if (hasNightOwlPattern && hasNightOwlPattern.confidence > 0.7) {
      insights.push({
        type: 'neutral',
        category: 'behavior',
        title: 'Night Owl Viewing Pattern',
        description: `${(hasNightOwlPattern.confidence * 100).toFixed(0)}% confidence you're a night owl viewer.`,
        recommendation: 'Late night viewing might affect sleep quality. Consider evening wind-down routines.'
      })
    }

    // Diversity insight
    if (kpis.contentDiversityIndex > 0.3) {
      insights.push({
        type: 'positive',
        category: 'content',
        title: 'Diverse Content Interests',
        description: `High diversity index of ${(kpis.contentDiversityIndex * 100).toFixed(1)}% shows broad interests across topics.`,
        recommendation: 'Your diverse viewing helps you stay informed across multiple domains.'
      })
    }

    return insights
  }

  const insights = generateAutomatedInsights()

  const handleExport = async (format: 'csv' | 'json' | 'pdf') => {
    setIsExporting(format)
    
    try {
      if (format === 'csv') {
        await exportToCSV()
      } else if (format === 'json') {
        await exportToJSON()
      } else if (format === 'pdf') {
        await exportToPDF()
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(null)
    }
  }

  const exportToCSV = async () => {
    const csvData = data.map(record => ({
      date: record.watchedAt || '',
      title: record.videoTitle || '',
      channel: record.channelTitle || '',
      product: record.product,
      topics: record.topics.join(';'),
      hour: record.hour || '',
      dayOfWeek: record.dayOfWeek || ''
    }))

    const csvHeaders = Object.keys(csvData[0] || {})
    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => csvHeaders.map(header => `"${row[header as keyof typeof row]}"`).join(','))
    ].join('\n')

    downloadFile(csvContent, 'youtube-analytics-data.csv', 'text/csv')
  }

  const exportToJSON = async () => {
    const exportData = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalRecords: data.length,
        analyticsVersion: '1.0'
      },
      rawData: data,
      analytics: analytics,
      insights: insights
    }

    downloadFile(JSON.stringify(exportData, null, 2), 'youtube-analytics-report.json', 'application/json')
  }

  const exportToPDF = async () => {
    // For now, create a simple text report
    // In production, you'd use a library like jsPDF
    const textReport = generateTextReport()
    downloadFile(textReport, 'youtube-analytics-report.txt', 'text/plain')
  }

  const generateTextReport = (): string => {
    const kpis = analytics.advancedKPIs
    const sessions = analytics.sessionAnalysis
    
    return `
YOUTUBE ANALYTICS INTELLIGENCE REPORT
Generated: ${new Date().toISOString()}

=== OVERVIEW ===
Total Videos Watched: ${kpis.totalVideos.toLocaleString()}
Unique Channels: ${kpis.uniqueChannels.toLocaleString()}
Estimated Watch Time: ${Math.floor(kpis.estimatedWatchTime / 60)}h ${kpis.estimatedWatchTime % 60}m
Average Videos Per Day: ${kpis.avgVideosPerDay.toFixed(1)}

=== CONSUMPTION PATTERNS ===
Session Analysis:
- Total Sessions: ${sessions.totalSessions}
- Average Session Length: ${sessions.avgSessionLength.toFixed(1)} videos
- Binge Sessions (5+ videos): ${sessions.bingeSessions}
- Sessions Per Day: ${sessions.sessionsPerDay.toFixed(1)}

Content Quality:
- Educational Content: ${kpis.educationalContentRatio.toFixed(1)}%
- Long-form Content: ${kpis.longFormContentRatio.toFixed(1)}%
- Content Diversity Index: ${kpis.contentDiversityIndex.toFixed(1)}%

=== BEHAVIORAL INSIGHTS ===
${insights.map(insight => `
${insight.title}:
${insight.description}
${insight.recommendation ? `Recommendation: ${insight.recommendation}` : ''}
`).join('\n')}

=== DISCOVERY & GROWTH ===
Discovery Rate: ${kpis.discoveryRate.toFixed(1)} new channels/month
Repeat Channel Rate: ${kpis.repeatChannelRate.toFixed(1)}%
Monthly Growth Rate: ${kpis.monthlyGrowthRate.toFixed(1)}%
Viewing Consistency Score: ${kpis.viewingConsistencyScore.toFixed(0)}/100

Report generated by YouTube Analytics Intelligence Platform
`.trim()
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getInsightIcon = (type: AutomatedInsight['type']) => {
    switch (type) {
      case 'positive': return CheckCircle
      case 'negative': return AlertCircle
      default: return Lightbulb
    }
  }

  const getInsightColor = (type: AutomatedInsight['type']) => {
    switch (type) {
      case 'positive': return 'text-signal-green-400'
      case 'negative': return 'text-signal-red-400'
      default: return 'text-signal-blue-400'
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Automated Insights */}
      <Card className="terminal-surface border-terminal-border p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-terminal-text terminal-text mb-2">AUTOMATED_INSIGHTS</h3>
            <p className="text-sm text-terminal-muted terminal-text">
              AI-generated behavioral analysis and recommendations
            </p>
          </div>

          <div className="space-y-4 max-h-80 overflow-y-auto">
            {insights.map((insight, index) => {
              const InsightIcon = getInsightIcon(insight.type)
              
              return (
                <div 
                  key={index}
                  className="terminal-surface border-terminal-border rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 ${getInsightColor(insight.type)}`}>
                      <InsightIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-bold text-terminal-text terminal-text">
                          {insight.title}
                        </h4>
                        <div className="text-xs text-terminal-muted terminal-text uppercase">
                          {insight.category}
                        </div>
                      </div>
                      <p className="text-xs text-terminal-text terminal-text">
                        {insight.description}
                      </p>
                      {insight.recommendation && (
                        <div className="text-xs text-terminal-muted terminal-text bg-terminal-bg rounded p-2 border border-terminal-border">
                          💡 {insight.recommendation}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Export Options */}
      <Card className="terminal-surface border-terminal-border p-6">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-terminal-text terminal-text mb-2">EXPORT_DATA</h3>
            <p className="text-sm text-terminal-muted terminal-text">
              Download your analytics data and insights in various formats
            </p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => handleExport('csv')}
              disabled={isExporting === 'csv'}
              className="w-full justify-start"
              variant="outline"
            >
              {isExporting === 'csv' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-signal-green-500 mr-3" />
              ) : (
                <FileText className="w-4 h-4 mr-3" />
              )}
              EXPORT_CSV
              <span className="text-xs text-terminal-muted ml-auto">Raw data spreadsheet</span>
            </Button>

            <Button
              onClick={() => handleExport('json')}
              disabled={isExporting === 'json'}
              className="w-full justify-start"
              variant="outline"
            >
              {isExporting === 'json' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-signal-green-500 mr-3" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-3" />
              )}
              EXPORT_JSON
              <span className="text-xs text-terminal-muted ml-auto">Complete analytics</span>
            </Button>

            <Button
              onClick={() => handleExport('pdf')}
              disabled={isExporting === 'pdf'}
              className="w-full justify-start"
              variant="outline"
            >
              {isExporting === 'pdf' ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-signal-green-500 mr-3" />
              ) : (
                <Download className="w-4 h-4 mr-3" />
              )}
              EXPORT_REPORT
              <span className="text-xs text-terminal-muted ml-auto">Summary report</span>
            </Button>
          </div>

          {/* Export Info */}
          <div className="terminal-surface border-terminal-border rounded p-4 space-y-2 text-xs text-terminal-muted">
            <div className="font-medium text-terminal-text terminal-text">EXPORT_INFO:</div>
            <div>• CSV: Raw viewing data for external analysis</div>
            <div>• JSON: Complete dataset with analytics and insights</div>
            <div>• Report: Human-readable summary with recommendations</div>
            <div className="pt-2 border-t border-terminal-border">
              All exports are generated locally - your data never leaves your device.
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}