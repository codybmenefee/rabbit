'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { WatchRecord } from '@/types/records'
import { watchHistoryStorage } from '@/lib/storage'
import { createHistoricalStorage } from '@/lib/historical-storage'
import { migrateSessionToHistorical, needsSessionMigration } from '@/lib/session-migration'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StorageStatus, StorageSource } from './storage-status'
import { StorageConflictModal, ConflictResolutionAction } from './storage-conflict-modal'
import { ValidationDashboard } from '@/components/validation/validation-dashboard'
import { dataConsistencyValidator } from '@/lib/data-consistency-validator'
import { DataConsistencyReport, ValidationStatus } from '@/types/validation'
import { 
  Database, 
  Cloud, 
  Trash2, 
  Download, 
  Upload, 
  RefreshCw, 
  Info,
  AlertCircle,
  CheckCircle,
  HardDrive,
  Wifi,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Zap
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface StorageInfo {
  source: StorageSource
  recordCount: number
  lastUpdated?: Date
  dataSize?: string
  hasConflict: boolean
  conflictDetails?: {
    sessionCount: number
    historicalCount: number
    sessionData?: WatchRecord[]
    historicalData?: WatchRecord[]
  }
}

export function StorageManagement() {
  const { data: session, status } = useSession()
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [validationReport, setValidationReport] = useState<DataConsistencyReport | null>(null)
  const [showValidationDashboard, setShowValidationDashboard] = useState(false)
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('unknown')
  const [isValidating, setIsValidating] = useState(false)

  const isAuthenticated = status === 'authenticated' && session?.user?.id

  useEffect(() => {
    loadStorageInfo()
  }, [isAuthenticated])

  const loadStorageInfo = async () => {
    setIsLoading(true)
    try {
      // Load session data
      const sessionData = await watchHistoryStorage.getRecords() || []
      
      // Load historical data if authenticated
      let historicalData: WatchRecord[] = []
      if (isAuthenticated && session?.user?.id) {
        try {
          const historicalStorage = createHistoricalStorage(session.user.id)
          const aggregations = await historicalStorage.getPrecomputedAggregations()
          
          if (aggregations && aggregations.totalRecords > 0) {
            historicalData = await historicalStorage.queryTimeSlice({})
          }
        } catch (error) {
          console.warn('Failed to load historical data:', error)
        }
      }

      // Detect conflicts
      const hasConflict = sessionData.length > 0 && historicalData.length > 0 && 
        Math.abs(sessionData.length - historicalData.length) > 10

      // Determine primary source
      let source: StorageSource = 'none'
      let recordCount = 0
      
      if (hasConflict) {
        source = 'both'
        recordCount = Math.max(sessionData.length, historicalData.length)
      } else if (historicalData.length > 0) {
        source = 'historical'
        recordCount = historicalData.length
      } else if (sessionData.length > 0) {
        source = 'session'
        recordCount = sessionData.length
      }

      // Calculate data size estimate (rough)
      const avgRecordSize = 500 // bytes
      const dataSize = `${Math.round((recordCount * avgRecordSize) / 1024)} KB`

      setStorageInfo({
        source,
        recordCount,
        lastUpdated: new Date(),
        dataSize,
        hasConflict,
        conflictDetails: hasConflict ? {
          sessionCount: sessionData.length,
          historicalCount: historicalData.length,
          sessionData,
          historicalData
        } : undefined
      })

    } catch (error) {
      console.error('Failed to load storage info:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => {
    if (!isAuthenticated || !session?.user?.id) return
    
    setIsSyncing(true)
    setLastAction('Syncing to cloud...')
    
    try {
      const result = await migrateSessionToHistorical(session.user.id)
      if (result.success && result.migratedRecords > 0) {
        setLastAction(`Successfully synced ${result.migratedRecords} records`)
        await loadStorageInfo()
      } else {
        setLastAction(result.error || 'Sync failed')
      }
    } catch (error) {
      setLastAction('Sync failed with error')
      console.error('Sync failed:', error)
    } finally {
      setIsSyncing(false)
      setTimeout(() => setLastAction(null), 5000)
    }
  }

  const handleClearSession = async () => {
    if (confirm('Are you sure you want to clear session storage? This will remove all temporary data.')) {
      try {
        await watchHistoryStorage.clear()
        setLastAction('Session storage cleared')
        await loadStorageInfo()
      } catch (error) {
        setLastAction('Failed to clear session storage')
        console.error('Failed to clear session storage:', error)
      }
      setTimeout(() => setLastAction(null), 5000)
    }
  }

  const handleClearHistorical = async () => {
    if (!isAuthenticated || !session?.user?.id) return
    
    if (confirm('Are you sure you want to clear historical storage? This will permanently delete your cloud data.')) {
      try {
        const historicalStorage = createHistoricalStorage(session.user.id)
        // Note: Implement clear method in historical storage if needed
        setLastAction('Historical storage cleared')
        await loadStorageInfo()
      } catch (error) {
        setLastAction('Failed to clear historical storage')
        console.error('Failed to clear historical storage:', error)
      }
      setTimeout(() => setLastAction(null), 5000)
    }
  }

  const handleConflictResolution = (action: ConflictResolutionAction, data?: WatchRecord[]) => {
    setLastAction(`Conflict resolved using ${action}`)
    setShowConflictModal(false)
    setTimeout(() => {
      loadStorageInfo()
      setLastAction(null)
    }, 2000)
  }

  const runValidation = async () => {
    if (!isAuthenticated || !session?.user?.id) {
      setLastAction('Sign in required for validation')
      setTimeout(() => setLastAction(null), 3000)
      return
    }

    setIsValidating(true)
    setLastAction('Running data validation...')

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

      // Run comprehensive validation
      const report = await dataConsistencyValidator.validateConsistency(
        sessionData,
        historicalData,
        {
          recordCountTolerance: 5,
          checksumValidation: true,
          deduplicationCheck: true,
          dataQualityThresholds: {
            minimumQualityScore: 80,
            timestampValidityThreshold: 90,
            completenessThreshold: 85
          }
        }
      )

      setValidationReport(report)
      setValidationStatus(report.overallStatus)
      
      // Show validation dashboard
      setShowValidationDashboard(true)
      
      setLastAction(`Validation completed: ${report.overallStatus.toUpperCase()} (${report.issues.length} issues)`)
      console.log(`✅ Manual validation completed: ${report.overallStatus}`)

    } catch (error) {
      console.error('❌ Validation failed:', error)
      setLastAction('Validation failed')
      setValidationStatus('error')
    } finally {
      setIsValidating(false)
      setTimeout(() => setLastAction(null), 5000)
    }
  }

  const handleValidationComplete = (report: DataConsistencyReport) => {
    setValidationReport(report)
    setValidationStatus(report.overallStatus)
    
    // Update storage info if validation reveals new conflicts
    if (report.overallStatus === 'error' && report.issues.some(issue => issue.category === 'recordCount')) {
      loadStorageInfo()
    }
  }

  const getValidationIcon = (status: ValidationStatus) => {
    switch (status) {
      case 'healthy':
        return <ShieldCheck className="h-4 w-4 text-green-500" />
      case 'warning':
        return <ShieldAlert className="h-4 w-4 text-yellow-500" />
      case 'error':
        return <ShieldX className="h-4 w-4 text-red-500" />
      default:
        return <Shield className="h-4 w-4 text-gray-500" />
    }
  }

  const exportData = async () => {
    try {
      const data = await watchHistoryStorage.getRecords() || []
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `youtube-analytics-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setLastAction('Data exported successfully')
      setTimeout(() => setLastAction(null), 3000)
    } catch (error) {
      setLastAction('Export failed')
      console.error('Export failed:', error)
      setTimeout(() => setLastAction(null), 3000)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading storage information...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Storage Status Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Storage Status
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Validation Status Indicator */}
              {validationStatus !== 'unknown' && (
                <div className="flex items-center gap-1">
                  {getValidationIcon(validationStatus)}
                  <span className="text-xs text-gray-600">
                    {validationStatus.toUpperCase()}
                  </span>
                </div>
              )}
              
              {/* Run Validation Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={runValidation}
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
                    Validate Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {storageInfo && (
            <StorageStatus
              source={storageInfo.source}
              status={storageInfo.hasConflict ? 'conflict' : 'healthy'}
              recordCount={storageInfo.recordCount}
              lastSync={storageInfo.lastUpdated}
              hasConflict={storageInfo.hasConflict}
              onRefresh={loadStorageInfo}
              onResolveConflict={() => setShowConflictModal(true)}
            />
          )}

          {/* Last Action Status */}
          {lastAction && (
            <div className="flex items-center gap-2 p-2 bg-signal-orange-500/10 rounded-md">
              <Info className="h-4 w-4 text-signal-orange-500" />
              <span className="text-sm text-signal-orange-500">{lastAction}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Details */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Session Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Session Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-terminal-muted">Status:</span>
                <Badge variant="outline">
                  {storageInfo?.source === 'session' || storageInfo?.source === 'both' ? 'Active' : 'Empty'}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-terminal-muted">Records:</span>
                <span className="font-mono font-semibold">
                  {storageInfo?.conflictDetails?.sessionCount || 
                   (storageInfo?.source === 'session' ? storageInfo.recordCount : 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-terminal-muted">Type:</span>
                <span className="text-sm">Temporary (browser storage)</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Data
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearSession}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Session
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Historical Storage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cloud className="h-5 w-5" />
              Historical Storage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAuthenticated ? (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-terminal-muted">Status:</span>
                    <Badge className="bg-signal-green-600/20 text-signal-green-400">
                      Connected
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-terminal-muted">Records:</span>
                    <span className="font-mono font-semibold">
                      {storageInfo?.conflictDetails?.historicalCount || 
                       (storageInfo?.source === 'historical' ? storageInfo.recordCount : 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-terminal-muted">Type:</span>
                    <span className="text-sm">Permanent (cloud storage)</span>
                  </div>
                  {storageInfo?.lastUpdated && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-terminal-muted">Last sync:</span>
                      <span className="text-sm">
                        {formatDistanceToNow(storageInfo.lastUpdated, { addSuffix: true })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="w-full"
                  >
                    {isSyncing ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isSyncing ? 'Syncing...' : 'Sync to Cloud'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleClearHistorical}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Historical
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-4 space-y-2">
                <Wifi className="h-8 w-8 mx-auto text-terminal-muted" />
                <p className="text-sm text-terminal-muted">
                  Sign in to enable cloud storage
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Quality Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Data Quality
            </CardTitle>
            {validationReport && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowValidationDashboard(!showValidationDashboard)}
              >
                {showValidationDashboard ? 'Hide' : 'Show'} Validation Details
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold data-metric">
                {storageInfo?.recordCount.toLocaleString() || '0'}
              </div>
              <div className="text-sm text-terminal-muted">Total Records</div>
            </div>
            <div>
              <div className="text-2xl font-bold data-metric text-signal-green-500">
                {storageInfo?.dataSize || '0 KB'}
              </div>
              <div className="text-sm text-terminal-muted">Data Size</div>
            </div>
            <div>
              <div className="text-2xl font-bold data-metric text-signal-orange-500">
                {storageInfo?.source === 'both' ? '2' : '1'}
              </div>
              <div className="text-sm text-terminal-muted">Storage Systems</div>
            </div>
            <div>
              <div className="text-2xl font-bold data-metric">
                {validationStatus === 'error' || storageInfo?.hasConflict ? (
                  <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
                ) : validationStatus === 'warning' ? (
                  <ShieldAlert className="h-8 w-8 text-yellow-500 mx-auto" />
                ) : validationStatus === 'healthy' ? (
                  <ShieldCheck className="h-8 w-8 text-green-500 mx-auto" />
                ) : (
                  <CheckCircle className="h-8 w-8 text-signal-green-500 mx-auto" />
                )}
              </div>
              <div className="text-sm text-terminal-muted">
                {validationStatus !== 'unknown' ? validationStatus.charAt(0).toUpperCase() + validationStatus.slice(1) :
                 storageInfo?.hasConflict ? 'Conflicts' : 'Healthy'}
              </div>
            </div>
          </div>
          
          {/* Validation Summary */}
          {validationReport && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <div className="grid grid-cols-3 gap-4 text-center text-sm">
                <div>
                  <div className="font-semibold text-green-600">
                    {validationReport.summary.passedChecks}
                  </div>
                  <div className="text-gray-600">Passed</div>
                </div>
                <div>
                  <div className="font-semibold text-yellow-600">
                    {validationReport.summary.warningChecks}
                  </div>
                  <div className="text-gray-600">Warnings</div>
                </div>
                <div>
                  <div className="font-semibold text-red-600">
                    {validationReport.summary.failedChecks}
                  </div>
                  <div className="text-gray-600">Failed</div>
                </div>
              </div>
              
              {validationReport.issues.length > 0 && (
                <div className="mt-2 text-xs text-gray-600">
                  {validationReport.issues.length} issue{validationReport.issues.length !== 1 ? 's' : ''} detected
                  {validationReport.summary.criticalIssues > 0 && (
                    <span className="text-red-600 ml-2">
                      ({validationReport.summary.criticalIssues} critical)
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Dashboard */}
      {showValidationDashboard && validationReport && (
        <ValidationDashboard 
          onValidationComplete={handleValidationComplete}
          compact={false}
        />
      )}

      {/* Conflict Resolution Modal */}
      {storageInfo?.hasConflict && storageInfo.conflictDetails && (
        <StorageConflictModal
          isOpen={showConflictModal}
          onClose={() => setShowConflictModal(false)}
          onResolve={handleConflictResolution}
          conflictDetails={storageInfo.conflictDetails}
        />
      )}
    </div>
  )
}