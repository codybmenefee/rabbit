'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/nextjs'
import { WatchRecord } from '@/lib/types'
import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StorageStatus, StorageSource } from './storage-status'
import { ValidationDashboard } from '@/components/validation/validation-dashboard'
import { dataConsistencyValidator } from '@/lib/data-consistency-validator'
import { DataConsistencyReport, ValidationStatus } from '@/lib/types'
import { 
  Cloud, 
  Trash2, 
  Download, 
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
  const { isLoaded, isSignedIn, userId } = useAuth()
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showConflictModal, setShowConflictModal] = useState(false)
  const [lastAction, setLastAction] = useState<string | null>(null)
  const [validationReport, setValidationReport] = useState<DataConsistencyReport | null>(null)
  const [showValidationDashboard, setShowValidationDashboard] = useState(false)
  const [validationStatus, setValidationStatus] = useState<ValidationStatus>('unknown')
  const [isValidating, setIsValidating] = useState(false)

  const isAuthenticated = !!userId

  const records = useQuery(api.dashboard.records, {}) as WatchRecord[] | undefined
  const clearAllUserData = useMutation(api.ingest.clearAllUserData)

  useEffect(() => {
    loadStorageInfo()
  }, [isAuthenticated, records])

  const loadStorageInfo = async () => {
    setIsLoading(true)
    try {
      const cloudData = records ?? []
      const hasConflict = false
      const source: StorageSource = cloudData.length > 0 ? 'historical' : 'none'
      const recordCount = cloudData.length

      // Calculate data size estimate (rough)
      const avgRecordSize = 500 // bytes
      const dataSize = `${Math.round((recordCount * avgRecordSize) / 1024)} KB`

      setStorageInfo({
        source,
        recordCount,
        lastUpdated: new Date(),
        dataSize,
        hasConflict,
        conflictDetails: undefined
      })

    } catch (error) {
      console.error('Failed to load storage info:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSync = async () => { /* no-op: Convex only */ }

  const handleClearSession = async () => { /* no-op: Convex only */ }

  const handleClearHistorical = async () => {
    if (!isAuthenticated || !userId) return
    
    if (confirm('Are you sure you want to clear historical storage? This will permanently delete your cloud data.')) {
      try {
        await clearAllUserData({})
        setLastAction('Cloud data cleared')
        await loadStorageInfo()
      } catch (error) {
        setLastAction('Failed to clear cloud data')
        console.error('Failed to clear cloud data:', error)
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
    if (!isAuthenticated || !userId) {
      setLastAction('Sign in required for validation')
      setTimeout(() => setLastAction(null), 3000)
      return
    }

    setIsValidating(true)
    setLastAction('Running data validation...')

    try {
      // Single-source validation against itself (Convex only)
      const cloudData: WatchRecord[] = records ?? []
      const report = await dataConsistencyValidator.validateConsistency(
        cloudData,
        cloudData,
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
      const data = records ?? []
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
      <div className="grid md:grid-cols-1 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cloud className="h-5 w-5" />
              Cloud Storage
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
                      {storageInfo?.recordCount || 0}
                    </span>
                  </div>
                  {storageInfo?.lastUpdated && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-terminal-muted">Last update:</span>
                      <span className="text-sm">
                        {formatDistanceToNow(storageInfo.lastUpdated, { addSuffix: true })}
                      </span>
                    </div>
                  )}
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
                    onClick={handleClearHistorical}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Cloud
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

      {/* No conflict resolution UI in Convex-only mode */}
    </div>
  )
}
