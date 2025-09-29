'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play } from 'lucide-react'

export function SimpleDashboard() {
  const videoCountData = useQuery(api.dashboard.videoCount)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <Card className="w-full max-w-md border border-white/10 bg-white/5 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-purple-500 to-cyan-400/90 text-white mb-4">
            <Play className="h-8 w-8" />
          </div>
          <CardTitle className="text-2xl font-semibold text-white">Videos Watched</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <div className="text-6xl font-bold text-white mb-2">
            {videoCountData?.count?.toLocaleString() ?? '0'}
          </div>
          <p className="text-slate-400">
            Total videos in your watch history
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
