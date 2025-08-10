'use client'

import { useState } from 'react'
import { YouTubeHistoryParser } from '@/lib/parser'

export function TestParser() {
  const [testResults, setTestResults] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const runParserTest = async () => {
    setIsLoading(true)
    setTestResults('Running parser test...\n')

    try {
      const parser = new YouTubeHistoryParser()
      
      // Load the sample file
      const response = await fetch('/watch-history.sample.html')
      const content = await response.text()
      
      const startTime = Date.now()
      const records = parser.parseHTML(content)
      const endTime = Date.now()
      
      const summary = parser.generateSummary(records)
      
      let results = `✅ Parser Test Results:\n\n`
      results += `Parse time: ${endTime - startTime}ms\n`
      results += `Total records: ${records.length}\n`
      results += `Unique channels: ${summary.uniqueChannels}\n`
      results += `YouTube: ${summary.productBreakdown.youtube}\n`
      results += `YouTube Music: ${summary.productBreakdown.youtubeMusic}\n\n`
      
      if (records.length > 0) {
        results += `Sample record:\n`
        results += JSON.stringify(records[0], null, 2) + '\n\n'
      }
      
      const recordsWithoutTimestamps = records.filter(r => !r.watchedAt).length
      const recordsWithoutVideos = records.filter(r => !r.videoTitle && !r.videoUrl).length
      
      results += `Data quality:\n`
      results += `Records without timestamps: ${recordsWithoutTimestamps}\n`
      results += `Records without video info: ${recordsWithoutVideos}\n`
      
      setTestResults(results)
      
    } catch (error) {
      setTestResults(`❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-4 border border-gray-600 rounded-lg bg-gray-800">
      <h3 className="text-white font-medium mb-3">Parser Test</h3>
      <button
        onClick={runParserTest}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-4 py-2 rounded mb-4"
      >
        {isLoading ? 'Testing...' : 'Run Parser Test'}
      </button>
      {testResults && (
        <pre className="text-sm text-gray-300 bg-gray-900 p-3 rounded overflow-auto max-h-96 whitespace-pre-wrap">
          {testResults}
        </pre>
      )}
    </div>
  )
}