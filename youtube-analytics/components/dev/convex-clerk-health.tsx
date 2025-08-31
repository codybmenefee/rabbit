'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'

export function ConvexClerkHealthBanner() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const [tokenOk, setTokenOk] = useState<'unknown' | 'ok' | 'error'>('unknown')
  const [tokenSnippet, setTokenSnippet] = useState<string>('')
  const [convexUrl, setConvexUrl] = useState<string>('')
  const status = useQuery(api.dashboard.status, isSignedIn ? {} : 'skip' as any)
  const [statusOk, setStatusOk] = useState<'unknown' | 'ok' | 'error'>('unknown')

  useEffect(() => {
    setConvexUrl(process.env.NEXT_PUBLIC_CONVEX_URL || '')
  }, [])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    ;(async () => {
      try {
        const t = await getToken({ template: 'convex' })
        if (t) {
          setTokenOk('ok')
          setTokenSnippet(`${t.slice(0, 12)}...${t.slice(-12)}`)
        } else {
          setTokenOk('error')
        }
      } catch {
        setTokenOk('error')
      }
    })()
  }, [isLoaded, isSignedIn, getToken])

  useEffect(() => {
    if (status === undefined) setStatusOk('unknown')
    else if (status === null) setStatusOk('error')
    else setStatusOk('ok')
  }, [status])

  if (!isLoaded) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 text-xs">
      <div className="rounded-md border border-white/10 bg-black/60 backdrop-blur px-3 py-2 shadow">
        <div className="font-semibold text-white mb-1">Convex/Clerk Health</div>
        <div className="text-gray-300 space-y-1">
          <div>
            <span className="text-gray-400">Signed In:</span>{' '}
            <span className={isSignedIn ? 'text-green-400' : 'text-red-400'}>{isSignedIn ? 'yes' : 'no'}</span>
          </div>
          <div>
            <span className="text-gray-400">Token (template "convex"):</span>{' '}
            <span className={tokenOk === 'ok' ? 'text-green-400' : tokenOk === 'error' ? 'text-red-400' : 'text-yellow-400'}>{tokenOk}</span>
            {tokenOk === 'ok' && tokenSnippet && (
              <span className="text-gray-500"> • {tokenSnippet}</span>
            )}
          </div>
          <div>
            <span className="text-gray-400">Convex URL:</span>{' '}
            <span className="text-blue-300">{convexUrl || '(unset)'}</span>
          </div>
          <div>
            <span className="text-gray-400">Convex status query:</span>{' '}
            <span className={statusOk === 'ok' ? 'text-green-400' : statusOk === 'error' ? 'text-red-400' : 'text-yellow-400'}>{statusOk}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

