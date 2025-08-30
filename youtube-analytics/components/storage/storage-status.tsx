'use client'

import { useAuth } from '@clerk/nextjs'
import { Database, Cloud, AlertTriangle, CheckCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type StorageSource = 'session' | 'historical' | 'both' | 'none'
export type StorageStatus = 'healthy' | 'conflict' | 'syncing' | 'error' | 'offline'

interface StorageStatusProps {
  source: StorageSource
  status: StorageStatus
  recordCount: number
  lastSync?: Date
  hasConflict?: boolean
  onRefresh?: () => void
  onResolveConflict?: () => void
  className?: string
}

export function StorageStatus({
  source,
  status,
  recordCount,
  lastSync,
  hasConflict,
  onRefresh,
  onResolveConflict,
  className
}: StorageStatusProps) {
  const { userId } = useAuth()
  const isAuthenticated = !!userId

  const getStatusColor = (status: StorageStatus) => {
    switch (status) {
      case 'healthy': return 'text-signal-green-500'
      case 'conflict': return 'text-yellow-500'
      case 'syncing': return 'text-signal-orange-500'
      case 'error': return 'text-signal-red-500'
      case 'offline': return 'text-gray-500'
      default: return 'text-terminal-muted'
    }
  }

  const getStatusIcon = (status: StorageStatus, source: StorageSource) => {
    if (status === 'conflict') return AlertTriangle
    if (status === 'syncing') return RefreshCw
    if (status === 'offline') return WifiOff
    if (status === 'error') return AlertTriangle
    if (status === 'healthy' && source === 'historical') return Cloud
    if (status === 'healthy' && source === 'session') return Database
    if (source === 'both') return CheckCircle
    return Wifi
  }

  const getStatusText = (status: StorageStatus, source: StorageSource) => {
    if (status === 'conflict') return 'Storage Conflict'
    if (status === 'syncing') return 'Syncing...'
    if (status === 'offline') return 'Offline Mode'
    if (status === 'error') return 'Storage Error'
    if (source === 'historical') return 'Cloud Storage'
    if (source === 'session') return 'Local Storage'
    if (source === 'both') return 'Merged Storage'
    return 'No Data'
  }

  const StatusIcon = getStatusIcon(status, source)
  const statusColor = getStatusColor(status)
  const statusText = getStatusText(status, source)

  return (
    <div className={cn('flex items-center justify-between p-3 terminal-surface rounded-lg', className)}>
      <div className="flex items-center space-x-3">
        {/* Status Icon and Info */}
        <div className="flex items-center space-x-2">
          <StatusIcon 
            className={cn('h-4 w-4', statusColor, {
              'animate-spin': status === 'syncing'
            })} 
          />
          <span className="text-sm font-medium terminal-text">{statusText}</span>
        </div>

        {/* Record Count */}
        <Badge variant="outline" className="font-mono text-xs">
          {recordCount.toLocaleString()} records
        </Badge>

        {/* Conflict Warning */}
        {hasConflict && (
          <Badge variant="destructive" className="text-xs animate-pulse">
            Conflict Detected
          </Badge>
        )}

        {/* Authentication Status */}
        {isAuthenticated && source === 'historical' && (
          <Badge className="bg-signal-green-600/20 text-signal-green-400 text-xs">
            Synced
          </Badge>
        )}

        {!isAuthenticated && source === 'session' && (
          <Badge variant="outline" className="text-terminal-muted text-xs">
            Local Only
          </Badge>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Last Sync Time */}
        {lastSync && (
          <span className="text-xs text-terminal-muted">
            Last sync: {lastSync.toLocaleTimeString()}
          </span>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-2">
          {hasConflict && onResolveConflict && (
            <Button
              size="sm"
              variant="destructive"
              onClick={onResolveConflict}
              className="h-6 px-2 text-xs"
            >
              Resolve
            </Button>
          )}

          {onRefresh && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onRefresh}
              className="h-6 px-2 text-xs"
            >
              Refresh
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

// Standalone storage indicator for use in headers/navigation
export function StorageIndicator({
  source,
  status,
  hasConflict,
  className
}: {
  source: StorageSource
  status: StorageStatus
  hasConflict?: boolean
  className?: string
}) {
  const StatusIcon = getStatusIcon(status, source)
  const statusColor = getStatusColor(status)

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <StatusIcon 
        className={cn('h-3 w-3', statusColor, {
          'animate-spin': status === 'syncing'
        })} 
      />
      {hasConflict && (
        <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      )}
    </div>
  )
}

// Helper functions (duplicated to avoid circular imports)
function getStatusColor(status: StorageStatus) {
  switch (status) {
    case 'healthy': return 'text-signal-green-500'
    case 'conflict': return 'text-yellow-500'
    case 'syncing': return 'text-signal-orange-500'
    case 'error': return 'text-signal-red-500'
    case 'offline': return 'text-gray-500'
    default: return 'text-terminal-muted'
  }
}

function getStatusIcon(status: StorageStatus, source: StorageSource) {
  if (status === 'conflict') return AlertTriangle
  if (status === 'syncing') return RefreshCw
  if (status === 'offline') return WifiOff
  if (status === 'error') return AlertTriangle
  if (status === 'healthy' && source === 'historical') return Cloud
  if (status === 'healthy' && source === 'session') return Database
  if (source === 'both') return CheckCircle
  return Wifi
}
