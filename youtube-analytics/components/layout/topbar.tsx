'use client'

import { useState } from 'react'
import { Calendar, Filter, RefreshCw, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Select } from '@/components/ui/select'

const timeframeOptions = [
  { value: 'mtd', label: 'Month to Date' },
  { value: 'qtd', label: 'Quarter to Date' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'last30', label: 'Last 30 Days' },
  { value: 'last90', label: 'Last 90 Days' },
  { value: 'last180', label: 'Last 6 Months' },
  { value: 'last365', label: 'Last 12 Months' },
  { value: 'all', label: 'All Time' },
]

const productOptions = [
  { value: 'all', label: 'All Products' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'youtube-music', label: 'YouTube Music' },
]

interface TopbarProps {
  onTimeframeChange?: (value: string) => void
  onProductChange?: (value: string) => void
  onRefresh?: () => void
  className?: string
}

export function Topbar({ 
  onTimeframeChange, 
  onProductChange, 
  onRefresh,
  className 
}: TopbarProps) {
  const [timeframe, setTimeframe] = useState('ytd')
  const [product, setProduct] = useState('all')

  const handleTimeframeChange = (value: string) => {
    setTimeframe(value)
    onTimeframeChange?.(value)
  }

  const handleProductChange = (value: string) => {
    setProduct(value)
    onProductChange?.(value)
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
          <span className="text-gray-400">2 minutes ago</span>
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

        {/* Product Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <Select
            value={product}
            onValueChange={handleProductChange}
            options={productOptions}
            className="min-w-[120px]"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-white/[0.08]" />

        {/* Action Buttons */}
        <button
          onClick={onRefresh}
          className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:border-white/[0.12] hover:text-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          aria-label="Refresh data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        <button
          className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:border-white/[0.12] hover:text-gray-300 transition-all focus:outline-none focus:ring-2 focus:ring-purple-500/30"
          aria-label="Export data"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}