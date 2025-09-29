'use client'

import { useState, useEffect, useCallback } from 'react'

// Ensure this page is always dynamically rendered to prevent caching of user data
export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'
import { useAuth } from '@clerk/nextjs'
import { WatchRecord } from '@/lib/types'
import { Card } from '@/components/ui/card'
import { Loader2, Calendar, Clock, Film, ChevronLeft, ChevronRight, ExternalLink, AlertCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

const ITEMS_PER_PAGE = 100

export default function HistoryPage() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold text-white mb-4">History</h1>
      <p className="text-gray-400">Coming Soon</p>
      <p className="text-sm text-gray-500">This feature is under development.</p>
    </div>
  )
}
