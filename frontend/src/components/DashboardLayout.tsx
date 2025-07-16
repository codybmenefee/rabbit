'use client';

import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  TableCellsIcon, 
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  CogIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface DashboardLayoutProps {
  sessionId: string;
  initialMetrics: any;
  processingStats: any;
  quotaUsage?: any;
  onBackToUpload: () => void;
}

export default function DashboardLayout({ 
  sessionId, 
  initialMetrics, 
  processingStats, 
  quotaUsage,
  onBackToUpload 
}: DashboardLayoutProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={onBackToUpload}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              <span>Upload New File</span>
            </button>
            
            <div className="h-6 border-l border-gray-300" />
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Your YouTube Analytics</h1>
              <p className="text-sm text-gray-500">Session: {sessionId}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <DocumentArrowDownIcon className="h-4 w-4" />
              <span>Export Data</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <CogIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-2 mr-4">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Videos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {initialMetrics?.totalVideos?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-2 mr-4">
                <SparklesIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Watch Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {initialMetrics?.totalWatchTime ? 
                    `${Math.round(initialMetrics.totalWatchTime / 60)}h` : 
                    '0h'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-2 mr-4">
                <TableCellsIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Unique Channels</p>
                <p className="text-2xl font-bold text-gray-900">
                  {initialMetrics?.uniqueChannels?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-lg p-2 mr-4">
                <DocumentArrowDownIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Processing Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {processingStats?.processingTime ? 
                    `${Math.round(processingStats.processingTime)}s` : 
                    '0s'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content Placeholder */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <div className="max-w-md mx-auto">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-full h-24 w-24 flex items-center justify-center mx-auto mb-6">
            <ChartBarIcon className="h-12 w-12 text-blue-600" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            🎉 Data Processing Complete!
          </h3>
          
          <p className="text-gray-600 mb-6">
            Your YouTube watch history has been successfully processed and analyzed. 
            The comprehensive dashboard with interactive charts, detailed analytics, 
            and trend visualizations is ready for implementation.
          </p>

          <div className="bg-blue-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-blue-900 mb-2">What's Available:</h4>
            <ul className="text-sm text-blue-800 space-y-1 text-left">
              <li>• Interactive charts and visualizations</li>
              <li>• Content category breakdown and trends</li>
              <li>• Top channels and creator analytics</li>
              <li>• Temporal viewing patterns (hourly, daily, monthly)</li>
              <li>• Data export in multiple formats</li>
              <li>• Advanced filtering and search capabilities</li>
            </ul>
          </div>

          <div className="text-sm text-gray-500 space-y-2">
            <p><strong>Processed:</strong> {processingStats?.validEntries} valid entries</p>
            <p><strong>API Enriched:</strong> {processingStats?.errors?.length || 0} errors</p>
            {quotaUsage && (
              <p><strong>API Quota:</strong> {quotaUsage.used}/{quotaUsage.used + quotaUsage.remaining} used</p>
            )}
          </div>
        </div>
      </div>

      {/* Additional Sections Placeholder */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h3>
          <div className="space-y-3">
            {initialMetrics?.categories?.slice(0, 5).map((category: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{category.category}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${category.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-gray-900">
                    {category.percentage}%
                  </span>
                </div>
              </div>
            )) || (
              <p className="text-sm text-gray-500 italic">No category data available</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Channels</h3>
          <div className="space-y-3">
            {initialMetrics?.mostWatchedChannels?.slice(0, 5).map((channel: any, index: number) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 truncate">{channel.channel}</span>
                <span className="text-sm font-medium text-gray-900">
                  {channel.count} videos
                </span>
              </div>
            )) || (
              <p className="text-sm text-gray-500 italic">No channel data available</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}