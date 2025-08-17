'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { WatchRecord } from '@/types/records'
import { watchHistoryStorage } from '@/lib/storage'
import { createHistoricalStorage } from '@/lib/historical-storage'
import { migrateSessionToHistorical } from '@/lib/session-migration'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Database, 
  Cloud, 
  Merge, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Calendar,
  BarChart3,
  Users,
  Hash
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface StorageConflictModalProps {
  isOpen: boolean
  onClose: () => void
  onResolve: (action: ConflictResolutionAction, data?: WatchRecord[]) => void
  conflictDetails: {
    sessionCount: number
    historicalCount: number
    sessionData?: WatchRecord[]
    historicalData?: WatchRecord[]
  }
}

export type ConflictResolutionAction = 'use-session' | 'use-historical' | 'merge-data' | 'force-sync'

interface DataSourceComparison {
  recordCount: number
  dateRange: { start: Date | null; end: Date | null }
  topChannels: string[]
  topTopics: string[]
  lastActivity: Date | null
  dataQualityScore: number
}

export function StorageConflictModal({ 
  isOpen, 
  onClose, 
  onResolve, 
  conflictDetails 
}: StorageConflictModalProps) {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAction, setSelectedAction] = useState<ConflictResolutionAction | null>(null)
  const [sessionComparison, setSessionComparison] = useState<DataSourceComparison | null>(null)
  const [historicalComparison, setHistoricalComparison] = useState<DataSourceComparison | null>(null)
  const [detailedAnalysis, setDetailedAnalysis] = useState(false)

  useEffect(() => {
    if (isOpen && conflictDetails.sessionData && conflictDetails.historicalData) {
      analyzeDataSources()
    }
  }, [isOpen, conflictDetails])

  const analyzeDataSources = async () => {
    if (!conflictDetails.sessionData || !conflictDetails.historicalData) return

    // Analyze session data
    const sessionAnalysis = analyzeDataSource(conflictDetails.sessionData)
    setSessionComparison(sessionAnalysis)

    // Analyze historical data  
    const historicalAnalysis = analyzeDataSource(conflictDetails.historicalData)
    setHistoricalComparison(historicalAnalysis)
  }

  const analyzeDataSource = (data: WatchRecord[]): DataSourceComparison => {
    if (data.length === 0) {
      return {
        recordCount: 0,
        dateRange: { start: null, end: null },
        topChannels: [],
        topTopics: [],
        lastActivity: null,
        dataQualityScore: 0
      }
    }

    // Extract valid dates
    const validDates = data
      .map(r => r.watchedAt ? new Date(r.watchedAt) : null)
      .filter((date): date is Date => date !== null && !isNaN(date.getTime()))

    const dateRange = {
      start: validDates.length > 0 ? new Date(Math.min(...validDates.map(d => d.getTime()))) : null,
      end: validDates.length > 0 ? new Date(Math.max(...validDates.map(d => d.getTime()))) : null
    }

    // Channel analysis
    const channelCounts = data
      .filter(r => r.channelTitle)
      .reduce((acc, r) => {
        acc[r.channelTitle!] = (acc[r.channelTitle!] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const topChannels = Object.entries(channelCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([channel]) => channel)

    // Topic analysis
    const topicCounts = data
      .flatMap(r => r.topics)
      .reduce((acc, topic) => {
        acc[topic] = (acc[topic] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const topTopics = Object.entries(topicCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic)

    // Data quality score (0-100)
    const hasTimestamps = data.filter(r => r.watchedAt).length / data.length
    const hasChannels = data.filter(r => r.channelTitle).length / data.length
    const hasTitles = data.filter(r => r.videoTitle).length / data.length
    const dataQualityScore = Math.round((hasTimestamps + hasChannels + hasTitles) / 3 * 100)

    return {
      recordCount: data.length,
      dateRange,
      topChannels,
      topTopics,
      lastActivity: dateRange.end,
      dataQualityScore
    }
  }

  const handleResolveConflict = async (action: ConflictResolutionAction) => {
    setIsLoading(true)
    setSelectedAction(action)

    try {
      switch (action) {
        case 'use-session':
          onResolve(action, conflictDetails.sessionData)
          break
        case 'use-historical':
          onResolve(action, conflictDetails.historicalData)
          break
        case 'merge-data':
          const mergedData = await mergeDataSources()
          onResolve(action, mergedData)
          break
        case 'force-sync':
          if (session?.user?.id && conflictDetails.sessionData) {
            await migrateSessionToHistorical(session.user.id)
            onResolve(action, conflictDetails.sessionData)
          }
          break
      }
    } catch (error) {
      console.error('Failed to resolve conflict:', error)
    } finally {
      setIsLoading(false)
      onClose()
    }
  }

  const mergeDataSources = async (): Promise<WatchRecord[]> => {
    const sessionData = conflictDetails.sessionData || []
    const historicalData = conflictDetails.historicalData || []
    
    // Create a map to deduplicate by ID
    const mergedMap = new Map<string, WatchRecord>()
    
    // Add historical data first (lower priority)
    historicalData.forEach(record => {
      mergedMap.set(record.id, record)
    })
    
    // Add session data (higher priority, will overwrite)
    sessionData.forEach(record => {
      mergedMap.set(record.id, record)
    })
    
    return Array.from(mergedMap.values()).sort((a, b) => {
      if (!a.watchedAt || !b.watchedAt) return 0
      return new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime()
    })
  }

  const getRecommendedAction = (): ConflictResolutionAction => {
    if (!sessionComparison || !historicalComparison) return 'use-session'
    
    // If session has significantly more recent data, recommend session
    if (sessionComparison.recordCount > historicalComparison.recordCount * 1.1) {
      return 'force-sync'
    }
    
    // If historical has better quality, recommend historical
    if (historicalComparison.dataQualityScore > sessionComparison.dataQualityScore + 10) {
      return 'use-historical'
    }
    
    // Default to merge if similar quality
    return 'merge-data'
  }

  const DataSourceCard = ({ 
    title, 
    icon: Icon, 
    comparison, 
    isRecommended, 
    action 
  }: {
    title: string
    icon: React.ComponentType<any>
    comparison: DataSourceComparison | null
    isRecommended: boolean
    action: ConflictResolutionAction
  }) => (
    <Card className={`relative ${isRecommended ? 'ring-2 ring-signal-green-500' : ''}`}>
      {isRecommended && (
        <Badge className="absolute -top-2 -right-2 bg-signal-green-600 text-white">
          Recommended
        </Badge>
      )}
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comparison ? (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-terminal-muted" />
                <span className="text-terminal-muted">Records:</span>
                <span className="font-mono font-semibold">
                  {comparison.recordCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-terminal-muted" />
                <span className="text-terminal-muted">Quality:</span>
                <span className="font-mono font-semibold">
                  {comparison.dataQualityScore}%
                </span>
              </div>
            </div>

            {comparison.dateRange.start && comparison.dateRange.end && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-terminal-muted" />
                <span className="text-terminal-muted">Range:</span>
                <span className="font-mono text-xs">
                  {comparison.dateRange.start.toLocaleDateString()} - {comparison.dateRange.end.toLocaleDateString()}
                </span>
              </div>
            )}

            {comparison.lastActivity && (
              <div className="flex items-center gap-2 text-sm">
                <RefreshCw className="h-4 w-4 text-terminal-muted" />
                <span className="text-terminal-muted">Last Activity:</span>
                <span className="font-mono text-xs">
                  {formatDistanceToNow(comparison.lastActivity, { addSuffix: true })}
                </span>
              </div>
            )}

            {detailedAnalysis && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-terminal-muted" />
                    <span className="text-terminal-muted">Top Channels:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {comparison.topChannels.slice(0, 3).map(channel => (
                      <Badge key={channel} variant="outline" className="text-xs">
                        {channel}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-terminal-muted" />
                    <span className="text-terminal-muted">Top Topics:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {comparison.topTopics.slice(0, 3).map(topic => (
                      <Badge key={topic} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center text-terminal-muted py-4">
            <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Analyzing data...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )

  const recommendedAction = getRecommendedAction()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
            Storage Conflict Resolution
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Conflict Overview */}
          <Card className="border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-500 mb-2">What's happening?</h3>
                  <p className="text-sm text-terminal-muted mb-3">
                    We detected conflicting data between your session storage (temporary) and historical storage (permanent). 
                    This usually happens when new data hasn't been synced yet, or when there are network issues.
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Session: <strong>{conflictDetails.sessionCount.toLocaleString()}</strong> records
                    </span>
                    <span className="flex items-center gap-2">
                      <Cloud className="h-4 w-4" />
                      Historical: <strong>{conflictDetails.historicalCount.toLocaleString()}</strong> records
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Source Comparison */}
          <div className="grid md:grid-cols-2 gap-4">
            <DataSourceCard
              title="Session Storage"
              icon={Database}
              comparison={sessionComparison}
              isRecommended={recommendedAction === 'use-session' || recommendedAction === 'force-sync'}
              action="use-session"
            />
            <DataSourceCard
              title="Historical Storage"
              icon={Cloud}
              comparison={historicalComparison}
              isRecommended={recommendedAction === 'use-historical'}
              action="use-historical"
            />
          </div>

          {/* Detailed Analysis Toggle */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDetailedAnalysis(!detailedAnalysis)}
              className="text-terminal-muted hover:text-terminal-text"
            >
              {detailedAnalysis ? 'Hide' : 'Show'} Detailed Analysis
            </Button>
          </div>

          {/* Resolution Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Choose Resolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <Button
                  variant={recommendedAction === 'use-session' ? 'default' : 'outline'}
                  onClick={() => handleResolveConflict('use-session')}
                  disabled={isLoading}
                  className="justify-start h-auto p-4"
                >
                  <div className="flex items-center gap-3">
                    <Database className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold">Use Session Storage</div>
                      <div className="text-sm text-terminal-muted">
                        Use the temporary data (usually more recent)
                      </div>
                    </div>
                    {recommendedAction === 'use-session' && (
                      <CheckCircle className="h-4 w-4 ml-auto text-signal-green-500" />
                    )}
                  </div>
                </Button>

                <Button
                  variant={recommendedAction === 'use-historical' ? 'default' : 'outline'}
                  onClick={() => handleResolveConflict('use-historical')}
                  disabled={isLoading}
                  className="justify-start h-auto p-4"
                >
                  <div className="flex items-center gap-3">
                    <Cloud className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold">Use Historical Storage</div>
                      <div className="text-sm text-terminal-muted">
                        Use the permanent cloud data (usually more stable)
                      </div>
                    </div>
                    {recommendedAction === 'use-historical' && (
                      <CheckCircle className="h-4 w-4 ml-auto text-signal-green-500" />
                    )}
                  </div>
                </Button>

                <Button
                  variant={recommendedAction === 'merge-data' ? 'default' : 'outline'}
                  onClick={() => handleResolveConflict('merge-data')}
                  disabled={isLoading}
                  className="justify-start h-auto p-4"
                >
                  <div className="flex items-center gap-3">
                    <Merge className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold">Merge Both Sources</div>
                      <div className="text-sm text-terminal-muted">
                        Intelligently combine data (session takes priority)
                      </div>
                    </div>
                    {recommendedAction === 'merge-data' && (
                      <CheckCircle className="h-4 w-4 ml-auto text-signal-green-500" />
                    )}
                  </div>
                </Button>

                <Button
                  variant={recommendedAction === 'force-sync' ? 'default' : 'outline'}
                  onClick={() => handleResolveConflict('force-sync')}
                  disabled={isLoading || !session?.user?.id}
                  className="justify-start h-auto p-4"
                >
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5" />
                    <div className="text-left">
                      <div className="font-semibold">Force Sync to Cloud</div>
                      <div className="text-sm text-terminal-muted">
                        Upload session data to historical storage
                      </div>
                    </div>
                    {recommendedAction === 'force-sync' && (
                      <CheckCircle className="h-4 w-4 ml-auto text-signal-green-500" />
                    )}
                  </div>
                </Button>
              </div>

              {!session?.user?.id && (
                <p className="text-sm text-terminal-muted">
                  * Force sync requires authentication
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}