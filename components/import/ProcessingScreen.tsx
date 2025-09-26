'use client'

import { useState, useEffect } from 'react'
import { Clock, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface ProcessingScreenProps {
  fileName: string
  duration: number
  message: string
  subMessage: string
  showProgress?: boolean
  recordCount?: number
}

export function ProcessingScreen({ 
  fileName, 
  duration, 
  message, 
  subMessage, 
  showProgress = false,
  recordCount 
}: ProcessingScreenProps) {
  const [dots, setDots] = useState('')

  // Animate dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return ''
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }

  return (
    <Card className="p-8 text-center">
      <div className="space-y-6">
        {/* Animated Icon */}
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-purple-500 mx-auto"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <FileText className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        {/* Main Message */}
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            {message}{dots}
          </h2>
          <p className="text-gray-400 text-lg">
            {subMessage}
          </p>
        </div>

        {/* File Info */}
        <div className="bg-gray-800/50 rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-300">
            <FileText className="h-4 w-4" />
            <span className="truncate">{fileName}</span>
          </div>
        </div>

        {/* Progress Info */}
        {showProgress && (
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-4 text-sm text-gray-400">
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4" />
                <span>Processing time: {formatDuration(duration)}</span>
              </div>
              {recordCount && (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="h-4 w-4" />
                  <span>{recordCount.toLocaleString()} records found</span>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: recordCount 
                    ? `${Math.min(100, (recordCount / 1000) * 100)}%` 
                    : '30%' 
                }}
              ></div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        <div className="text-sm text-gray-500 space-y-1">
          <p>• Large files may take several minutes to process</p>
          <p>• You can continue using the app while processing</p>
          <p>• Processing happens in the background</p>
        </div>

        {/* Estimated Time */}
        {duration > 30 && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 max-w-md mx-auto">
            <div className="flex items-center space-x-2 text-blue-300">
              <Clock className="h-4 w-4" />
              <span className="text-sm">
                Processing is taking longer than usual. This is normal for large files.
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
