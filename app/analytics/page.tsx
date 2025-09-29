'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { WatchRecord } from '@/lib/types'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'

export default function AnalyticsPage() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold text-white mb-4">Analytics</h1>
      <p className="text-gray-400">Coming Soon</p>
      <p className="text-sm text-gray-500">This feature is under development.</p>
    </div>
  )
}
