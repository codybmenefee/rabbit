'use client'

import { LoginButton } from '@/components/auth/login-button'

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your account</p>
        </div>

        {/* Authentication Section */}
        <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Authentication</h2>
          <p className="text-gray-400 mb-6">Sign in with your account</p>
          <LoginButton />
        </div>
      </div>
    </div>
  )
}