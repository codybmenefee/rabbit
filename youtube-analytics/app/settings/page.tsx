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
          <p className="text-gray-400">Manage your account and application preferences</p>
        </div>

        {/* Authentication Section */}
        <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Authentication</h2>
          <p className="text-gray-400 mb-6">Sign in with your Google account to save your analytics data</p>
          <LoginButton />
        </div>

        {/* Data Management Section */}
        <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Data Management</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Storage</h3>
              <p className="text-gray-400 text-sm mb-3">Your YouTube watch history is stored securely and only accessible by you</p>
              <div className="text-sm text-gray-500">
                No data imported yet
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="rounded-xl border bg-card/50 backdrop-blur-sm p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Privacy</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium text-white mb-2">Data Privacy</h3>
              <p className="text-gray-400 text-sm">
                Your YouTube data is processed entirely client-side. We never send your viewing history to external servers for analysis.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}