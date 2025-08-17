'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  DataConsistencyReport, 
  ValidationStatus, 
  ValidationSeverity, 
  StorageSystemMetrics,
  ValidationHistoryEntry
} from '@/types/validation'
import { WatchRecord } from '@/types/records'
import { watchHistoryStorage } from '@/lib/storage'
import { createHistoricalStorage } from '@/lib/historical-storage'
import { dataConsistencyValidator } from '@/lib/data-consistency-validator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldX,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Info,
  Database,
  Cloud,
  TrendingUp,
  TrendingDown,
  Clock,
  FileCheck,
  Zap
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ValidationDashboardProps {
  onValidationComplete?: (report: DataConsistencyReport) => void
  compact?: boolean
}

export function ValidationDashboard({ onValidationComplete, compact = false }: ValidationDashboardProps) {
  const { data: session, status } = useSession()
  const [validationReport, setValidationReport] = useState<DataConsistencyReport | null>(null)
  const [validationHistory, setValidationHistory] = useState<ValidationHistoryEntry[]>([])
  const [isValidating, setIsValidating] = useState(false)
  const [lastValidation, setLastValidation] = useState<Date | null>(null)
  const [autoValidationEnabled, setAutoValidationEnabled] = useState(true)

  const isAuthenticated = status === 'authenticated' && session?.user?.id

  useEffect(() => {
    loadValidationHistory()
    
    // Run initial validation if both storages have data
    if (isAuthenticated) {
      runValidationCheck()
    }
  }, [isAuthenticated])

  useEffect(() => {
    // Auto-validation every 5 minutes if enabled
    if (!autoValidationEnabled) return

    const interval = setInterval(() => {
      if (isAuthenticated && !isValidating) {
        runValidationCheck(true) // Silent validation
      }
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [autoValidationEnabled, isAuthenticated, isValidating])

  const loadValidationHistory = async () => {
    try {
      const history = await dataConsistencyValidator.getValidationHistory(5)
      setValidationHistory(history)
    } catch (error) {
      console.warn('Failed to load validation history:', error)
    }
  }

  const runValidationCheck = async (silent: boolean = false) => {
    if (!isAuthenticated || !session?.user?.id) return

    setIsValidating(true)
    if (!silent) {
      console.log('🔍 Running manual validation check...')
    }

    try {
      // Load data from both storage systems
      const sessionData = await watchHistoryStorage.getRecords()
      const historicalStorage = createHistoricalStorage(session.user.id)
      
      let historicalData: WatchRecord[] = []
      try {
        const aggregations = await historicalStorage.getPrecomputedAggregations()
        if (aggregations && aggregations.totalRecords > 0) {
          historicalData = await historicalStorage.queryTimeSlice({})
        }
      } catch (error) {
        console.warn('Failed to load historical data for validation:', error)
      }

      // Run validation
      const report = await dataConsistencyValidator.validateConsistency(
        sessionData,
        historicalData,
        {
          recordCountTolerance: 5,
          checksumValidation: true,
          deduplicationCheck: true
        }
      )

      setValidationReport(report)
      setLastValidation(new Date())
      
      // Update history
      await loadValidationHistory()
      
      if (onValidationComplete) {
        onValidationComplete(report)
      }

      if (!silent) {
        console.log(`✅ Validation completed: ${report.overallStatus}`)
      }

    } catch (error) {
      console.error('❌ Validation check failed:', error)
    } finally {
      setIsValidating(false)
    }
  }

  const getStatusIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'healthy':
        return <ShieldCheck className="h-5 w-5 text-green-500" />
      case 'warning':
        return <ShieldAlert className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <ShieldX className="h-5 w-5 text-red-500" />
      default:
        return <Shield className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: ValidationStatus) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getSeverityIcon = (severity: ValidationSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />
      case 'medium':
        return <Info className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  if (compact) {
    return (
      <Card className="border-l-4 border-l-blue-500">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {validationReport ? getStatusIcon(validationReport.overallStatus) : <Shield className="h-5 w-5 text-gray-500" />}
              <div>
                <div className="font-semibold text-sm">
                  Data Validation
                </div>
                <div className="text-xs text-gray-600">
                  {validationReport 
                    ? `${validationReport.summary.passedChecks}/${validationReport.summary.totalChecks} checks passed`
                    : 'Not validated'
                  }
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => runValidationCheck()}
              disabled={isValidating || !isAuthenticated}
            >
              {isValidating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {validationReport && validationReport.issues.length > 0 && (
            <div className="mt-2 text-xs">
              <Badge variant="outline" className="text-xs">
                {validationReport.issues.length} issue{validationReport.issues.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Validation Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Data Validation Status
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => runValidationCheck()}
                disabled={isValidating || !isAuthenticated}
              >
                {isValidating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Run Check
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {validationReport ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(validationReport.overallStatus)}
                  <div>
                    <div className="font-semibold">
                      {validationReport.overallStatus.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-600">
                      Overall data consistency status
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(validationReport.overallStatus)}>
                  {validationReport.overallStatus}
                </Badge>
              </div>

              {/* Validation Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {validationReport.summary.passedChecks}
                  </div>
                  <div className="text-sm text-gray-600">Passed Checks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {validationReport.summary.failedChecks}
                  </div>
                  <div className="text-sm text-gray-600">Failed Checks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {validationReport.summary.warningChecks}
                  </div>
                  <div className="text-sm text-gray-600">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {validationReport.issues.length}
                  </div>
                  <div className="text-sm text-gray-600">Total Issues</div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Check Success Rate</span>
                  <span>
                    {Math.round((validationReport.summary.passedChecks / validationReport.summary.totalChecks) * 100)}%
                  </span>
                </div>
                <Progress 
                  value={(validationReport.summary.passedChecks / validationReport.summary.totalChecks) * 100}
                  className="h-2"
                />
              </div>

              {/* Last Validation Time */}
              {lastValidation && (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  Last validated {formatDistanceToNow(lastValidation, { addSuffix: true })}
                  <span className="ml-2 text-xs">({validationReport.validationDuration}ms)</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No validation report available</p>
              <p className="text-sm">Run a validation check to see data consistency status</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Systems Metrics */}
      {validationReport && (
        <div className="grid md:grid-cols-2 gap-4">
          {/* Session Storage Metrics */}
          {validationReport.sessionMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Database className="h-4 w-4" />
                  Session Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Records</div>
                    <div className="font-semibold">{validationReport.sessionMetrics.recordCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Quality Score</div>
                    <div className="font-semibold">{validationReport.sessionMetrics.qualityMetrics.overallQualityScore}/100</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Channels</div>
                    <div className="font-semibold">{validationReport.sessionMetrics.uniqueChannels}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Data Size</div>
                    <div className="font-semibold">{Math.round(validationReport.sessionMetrics.dataSize / 1024)}KB</div>
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  Checksum: {validationReport.sessionMetrics.checksum}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Historical Storage Metrics */}
          {validationReport.historicalMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Cloud className="h-4 w-4" />
                  Historical Storage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-gray-600">Records</div>
                    <div className="font-semibold">{validationReport.historicalMetrics.recordCount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Quality Score</div>
                    <div className="font-semibold">{validationReport.historicalMetrics.qualityMetrics.overallQualityScore}/100</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Channels</div>
                    <div className="font-semibold">{validationReport.historicalMetrics.uniqueChannels}</div>
                  </div>
                  <div>
                    <div className="text-gray-600">Data Size</div>
                    <div className="font-semibold">{Math.round(validationReport.historicalMetrics.dataSize / 1024)}KB</div>
                  </div>
                </div>
                <div className="text-xs text-gray-600">
                  Checksum: {validationReport.historicalMetrics.checksum}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Issues and Recommendations */}
      {validationReport && validationReport.issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Issues & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Issues */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Detected Issues</h4>
              {validationReport.issues.map((issue, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                  {getSeverityIcon(issue.severity)}
                  <div className="flex-1">
                    <div className="font-medium text-sm">{issue.message}</div>
                    {issue.details && (
                      <div className="text-xs text-gray-600 mt-1">{issue.details}</div>
                    )}
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        {issue.severity}
                      </Badge>
                      <span className="text-xs text-gray-500">{issue.category}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Recommendations */}
            {validationReport.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Recommendations</h4>
                <div className="space-y-1">
                  {validationReport.recommendations.map((recommendation, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <div className="w-1 h-1 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                      <span>{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Validation History */}
      {validationHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="h-5 w-5" />
              Recent Validations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validationHistory.map((entry, index) => (
                <div key={entry.validationId} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(entry.status)}
                    <div>
                      <div className="text-sm font-medium">{entry.summary}</div>
                      <div className="text-xs text-gray-600">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">{entry.duration}ms</div>
                    {entry.issueCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        {entry.issueCount} issues
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto-validation Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium">Automatic Validation</div>
              <div className="text-sm text-gray-600">
                Run validation checks automatically every 5 minutes
              </div>
            </div>
            <Button
              variant={autoValidationEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setAutoValidationEnabled(!autoValidationEnabled)}
            >
              {autoValidationEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}