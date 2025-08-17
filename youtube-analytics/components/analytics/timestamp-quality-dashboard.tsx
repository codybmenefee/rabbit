'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { getTimestampExtractionStats } from '@/lib/resilient-timestamp-extractor'
import { TimestampParsingStats } from '@/types/records'
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  TrendingUp, 
  BarChart3,
  Zap,
  Globe,
  Target
} from 'lucide-react'

interface TimestampQualityDashboardProps {
  localStats?: TimestampParsingStats | null
  className?: string
}

interface GlobalExtractionStats {
  totalAttempts: number
  successfulExtractions: number
  failedExtractions: number
  overallSuccessRate: number
  strategyPerformance: Array<{
    strategy: string
    attempts: number
    successes: number
    successRate: number
  }>
}

export function TimestampQualityDashboard({ localStats, className = '' }: TimestampQualityDashboardProps) {
  const [globalStats, setGlobalStats] = useState<GlobalExtractionStats | null>(null)
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  // Load global statistics
  useEffect(() => {
    const loadGlobalStats = () => {
      try {
        const stats = getTimestampExtractionStats()
        setGlobalStats(stats)
        setLastUpdated(new Date())
      } catch (error) {
        console.warn('Failed to load global timestamp stats:', error)
      }
    }

    // Load immediately
    loadGlobalStats()

    // Set up refresh interval (every 30 seconds)
    const interval = setInterval(loadGlobalStats, 30000)
    setRefreshInterval(interval)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [])

  // Calculate quality score based on available metrics
  const calculateQualityScore = (stats: TimestampParsingStats): number => {
    if (stats.totalRecords === 0) return 0
    
    const successRate = (stats.recordsWithTimestamps / stats.totalRecords) * 100
    const confidenceScore = stats.averageConfidence
    const qualityBonus = stats.recordsWithTimestamps > 0 ? (
      (stats.qualityMetrics.withTimezones / stats.recordsWithTimestamps) * 10 +
      (stats.qualityMetrics.formatRecognized / stats.recordsWithTimestamps) * 10 +
      (stats.qualityMetrics.dateReasonable / stats.recordsWithTimestamps) * 5
    ) : 0
    
    return Math.min(100, Math.round((successRate * 0.6) + (confidenceScore * 0.3) + (qualityBonus * 0.1)))
  }

  // Get quality score color
  const getQualityColor = (score: number): string => {
    if (score >= 90) return 'text-green-400'
    if (score >= 80) return 'text-yellow-400'
    if (score >= 70) return 'text-orange-400'
    return 'text-red-400'
  }

  // Format timestamp for display
  const formatTimestamp = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  // Get top performing strategies
  const getTopStrategies = (strategies: GlobalExtractionStats['strategyPerformance']): Array<{strategy: string, rate: number}> => {
    return strategies
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3)
      .map(s => ({ strategy: s.strategy.split('-')[0], rate: s.successRate }))
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Timestamp Quality Analytics</h2>
          <p className="text-sm text-gray-400 mt-1">
            Real-time monitoring of timestamp extraction performance
          </p>
        </div>
        <div className="text-xs text-gray-400">
          Last updated: {formatTimestamp(lastUpdated)}
        </div>
      </div>

      {/* Quality Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {localStats && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Local Quality Score</p>
                <p className={`text-2xl font-bold ${getQualityColor(calculateQualityScore(localStats))}`}>
                  {calculateQualityScore(localStats)}/100
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-400" />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Based on {localStats.totalRecords} records
            </div>
          </Card>
        )}

        {globalStats && (
          <>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Global Success Rate</p>
                  <p className={`text-2xl font-bold ${getQualityColor(globalStats.overallSuccessRate)}`}>
                    {globalStats.overallSuccessRate.toFixed(1)}%
                  </p>
                </div>
                <Globe className="h-8 w-8 text-blue-400" />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {globalStats.totalAttempts} total attempts
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Successful Extractions</p>
                  <p className="text-2xl font-bold text-green-400">
                    {globalStats.successfulExtractions.toLocaleString()}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {globalStats.failedExtractions} failed
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Top Strategy</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {getTopStrategies(globalStats.strategyPerformance)[0]?.strategy || 'N/A'}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="mt-2 text-xs text-gray-400">
                {getTopStrategies(globalStats.strategyPerformance)[0]?.rate.toFixed(1) || 0}% success rate
              </div>
            </Card>
          </>
        )}
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Local Statistics */}
        {localStats && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Local Dataset Analysis</h3>
            </div>
            
            <div className="space-y-4">
              {/* Success Breakdown */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-400">Timestamp Success</span>
                  <span className="text-sm text-white">
                    {localStats.recordsWithTimestamps}/{localStats.totalRecords}
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${(localStats.recordsWithTimestamps / localStats.totalRecords) * 100}%` 
                    }}
                  />
                </div>
              </div>

              {/* Quality Metrics */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {localStats.recordsWithTimestamps > 0 ? 
                      Math.round((localStats.qualityMetrics.withTimezones / localStats.recordsWithTimestamps) * 100) : 0}%
                    </div>
                  <div className="text-xs text-gray-400">With Timezone</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {localStats.recordsWithTimestamps > 0 ? 
                      Math.round((localStats.qualityMetrics.formatRecognized / localStats.recordsWithTimestamps) * 100) : 0}%
                    </div>
                  <div className="text-xs text-gray-400">Recognized Format</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {localStats.recordsWithTimestamps > 0 ? 
                      Math.round((localStats.qualityMetrics.withFullDateTime / localStats.recordsWithTimestamps) * 100) : 0}%
                    </div>
                  <div className="text-xs text-gray-400">Full Date-Time</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">
                    {Math.round(localStats.averageConfidence)}%
                  </div>
                  <div className="text-xs text-gray-400">Avg Confidence</div>
                </div>
              </div>

              {/* Issues */}
              {(localStats.timestampExtractionFailures > 0 || localStats.lowConfidenceExtractions > 0) && (
                <div className="pt-4 border-t border-gray-700">
                  <h4 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4" />
                    Issues Detected
                  </h4>
                  <div className="space-y-1 text-sm">
                    {localStats.timestampExtractionFailures > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Extraction Failures:</span>
                        <span className="text-red-400">{localStats.timestampExtractionFailures}</span>
                      </div>
                    )}
                    {localStats.lowConfidenceExtractions > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Low Confidence:</span>
                        <span className="text-yellow-400">{localStats.lowConfidenceExtractions}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Global Strategy Performance */}
        {globalStats && globalStats.strategyPerformance.length > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">Strategy Performance</h3>
            </div>
            
            <div className="space-y-3">
              {globalStats.strategyPerformance
                .sort((a, b) => b.successRate - a.successRate)
                .slice(0, 6)
                .map((strategy, index) => (
                  <div key={strategy.strategy} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        index === 0 ? 'bg-green-400' : 
                        index === 1 ? 'bg-blue-400' : 
                        index === 2 ? 'bg-purple-400' : 'bg-gray-400'
                      }`} />
                      <span className="text-sm text-white font-medium">
                        {strategy.strategy.split('-')[0]}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-white">
                        {strategy.successRate.toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-400">
                        {strategy.successes}/{strategy.attempts}
                      </div>
                    </div>
                  </div>
                ))}
            </div>

            {/* Performance Insights */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <h4 className="text-sm font-medium text-gray-300 mb-2">Insights</h4>
              <div className="text-xs text-gray-400 space-y-1">
                <div>
                  • Best strategy: {getTopStrategies(globalStats.strategyPerformance)[0]?.strategy || 'Unknown'} 
                  ({getTopStrategies(globalStats.strategyPerformance)[0]?.rate.toFixed(1) || 0}%)
                </div>
                <div>
                  • Total strategies tested: {globalStats.strategyPerformance.length}
                </div>
                <div>
                  • Global improvement opportunity: {
                    globalStats.overallSuccessRate < 95 ? 
                      `${(95 - globalStats.overallSuccessRate).toFixed(1)}% to reach 95% target` :
                      'Excellent performance!'
                  }
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Action Items & Recommendations */}
      {localStats && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Recommendations</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-yellow-400 mb-2">Data Quality</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                {localStats.timestampExtractionFailures > 0 && (
                  <li>• Review {localStats.timestampExtractionFailures} failed extractions</li>
                )}
                {localStats.lowConfidenceExtractions > 0 && (
                  <li>• Investigate {localStats.lowConfidenceExtractions} low-confidence extractions</li>
                )}
                {(localStats.qualityMetrics.withTimezones / localStats.recordsWithTimestamps) < 0.8 && (
                  <li>• Consider timezone standardization for better accuracy</li>
                )}
                {localStats.averageConfidence < 80 && (
                  <li>• Review parsing patterns to improve confidence scores</li>
                )}
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-blue-400 mb-2">Performance</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Current success rate: {((localStats.recordsWithTimestamps / localStats.totalRecords) * 100).toFixed(1)}%</li>
                <li>• Target success rate: 95%+</li>
                {calculateQualityScore(localStats) >= 90 && (
                  <li>• ✅ Excellent quality - maintain current standards</li>
                )}
                {calculateQualityScore(localStats) < 90 && (
                  <li>• Focus on improving extraction confidence</li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}