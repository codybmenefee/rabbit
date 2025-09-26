'use client'

import { useState } from 'react'
import { getAllFixtures, generateDevelopmentSampleData, isDevelopmentEnvironment } from '@/lib/fixtures'
import { WatchRecord } from '@/lib/types'

interface DevControlsProps {
  onLoadSampleData?: (data: WatchRecord[]) => void
}

export function DevControls({ onLoadSampleData }: DevControlsProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Only show in development
  if (!isDevelopmentEnvironment()) {
    return null
  }

  const handleLoadFixtures = () => {
    const fixtures = getAllFixtures()
    onLoadSampleData?.(fixtures)
    console.log('Loaded fixture data:', fixtures.length, 'records')
  }

  const handleLoadSampleData = () => {
    const sampleData = generateDevelopmentSampleData()
    onLoadSampleData?.(sampleData)
    console.log('Loaded sample data:', sampleData.length, 'records')
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-yellow-500 hover:bg-yellow-600 text-black px-3 py-2 rounded-full text-sm font-medium shadow-lg transition-all duration-200"
        title="Developer Controls"
      >
        DEV
      </button>

      {/* Controls Panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 bg-slate-800 border border-slate-700 rounded-lg p-4 shadow-xl min-w-[280px]">
          <h3 className="text-white font-semibold mb-3 text-sm">Developer Controls</h3>
          
          <div className="space-y-2">
            <button
              onClick={handleLoadFixtures}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Load Test Fixtures
              <span className="block text-xs opacity-75">
                Edge cases, missing data, time variations
              </span>
            </button>

            <button
              onClick={handleLoadSampleData}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Load Sample Data
              <span className="block text-xs opacity-75">
                200 realistic records for development
              </span>
            </button>

            <button
              onClick={() => {
                localStorage.clear()
                window.location.reload()
              }}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm transition-colors"
            >
              Clear All Data
              <span className="block text-xs opacity-75">
                Reset app state
              </span>
            </button>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-700">
            <p className="text-xs text-gray-400">
              Available sample files:
              <br />• fixtures/watch-history.sample.html
              <br />• fixtures/*.json test cases
            </p>
          </div>
        </div>
      )}
    </div>
  )
}