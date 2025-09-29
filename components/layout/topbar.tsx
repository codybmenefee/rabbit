'use client'

import { useState } from 'react'
import { Calendar, Filter, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'

const timeframeOptions = [
  { value: 'mtd', label: 'Month to Date' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'all', label: 'All Time' },
]

interface TopbarProps {
  onTimeframeChange?: (value: string) => void
  onRefresh?: () => void
  className?: string
}

export function Topbar({ 
  onTimeframeChange, 
  onRefresh,
  className 
}: TopbarProps) {
  const [timeframe, setTimeframe] = useState('ytd')

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value)
    onTimeframeChange?.(value)
  }

  return (
    <div className={cn(
      "flex items-center justify-between h-16 px-6 bg-black/20 backdrop-blur-xl border-b border-white/[0.08]",
      className
    )}>
      {/* Left Section - Page Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold text-white">Dashboard</h1>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Last updated:</span>
          <span className="text-gray-400">Just now</span>
        </div>
      </div>

      {/* Right Section - Filters and Actions */}
      <div className="flex items-center gap-3">
        {/* Timeframe Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <Select
            value={timeframe}
            onValueChange={handleTimeframeChange}
            options={timeframeOptions}
            className="min-w-[140px]"
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:border-white/[0.12] hover:text-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          aria-label="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}