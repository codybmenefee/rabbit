'use client'

import type { ImportSummary } from '@/lib/types'
import { Calendar, Users, Youtube, Music, BarChart3, CheckCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ImportSummaryProps {
  summary: ImportSummary
  onContinue: () => void
  className?: string
}

export function ImportSummary({ summary, onContinue, className }: ImportSummaryProps) {
  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown'
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num)
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Success Header */}
      <div className="text-center space-y-3">
        <div className="flex justify-center">
          <div className="p-3 bg-green-500/10 rounded-full">
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Import Successful!</h2>
          <p className="text-gray-400">Your YouTube watch history has been processed and saved locally.</p>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{formatNumber(summary.totalRecords)}</p>
                <p className="text-sm text-muted-foreground">Total Watch Records</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Users className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{formatNumber(summary.uniqueChannels)}</p>
                <p className="text-sm text-muted-foreground">Unique Channels</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Date Range */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-cyan-400" />
            <span>Date Range</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Earliest Record</p>
              <p className="text-white font-medium">{formatDate(summary.dateRange.start)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Latest Record</p>
              <p className="text-white font-medium">{formatDate(summary.dateRange.end)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Content Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Youtube className="h-4 w-4 text-red-400" />
                <span className="text-gray-300">YouTube</span>
              </div>
              <div className="text-right">
                <p className="text-white font-medium">{formatNumber(summary.productBreakdown.youtube)}</p>
                <p className="text-xs text-muted-foreground">
                  {((summary.productBreakdown.youtube / summary.totalRecords) * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            {summary.productBreakdown.youtubeMusic > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Music className="h-4 w-4 text-orange-400" />
                  <span className="text-gray-300">YouTube Music</span>
                </div>
                <div className="text-right">
                  <p className="text-white font-medium">{formatNumber(summary.productBreakdown.youtubeMusic)}</p>
                  <p className="text-xs text-muted-foreground">
                    {((summary.productBreakdown.youtubeMusic / summary.totalRecords) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parse Errors (if any) */}
      {summary.parseErrors > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
          <h3 className="font-medium text-yellow-400 mb-2">Parsing Notes</h3>
          <p className="text-yellow-300 text-sm">
            {summary.parseErrors} entries couldn&apos;t be parsed completely. This is normal for entries like 
            ads, private videos, or corrupted data.
          </p>
        </div>
      )}

      {/* Continue Button */}
      <div className="pt-2">
        <Button
          onClick={onContinue}
          size="lg"
          className="w-full"
        >
          Continue to Dashboard
        </Button>
      </div>
    </div>
  )
}