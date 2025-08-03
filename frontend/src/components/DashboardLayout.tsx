'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChartBarIcon, 
  TableCellsIcon, 
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  Cog6ToothIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import Navigation from './Navigation';
import DashboardViews from './DashboardViews';

interface DashboardLayoutProps {
  sessionId: string;
  initialMetrics: any;
  processingStats: any;
  quotaUsage?: any;
  onBackToUpload: () => void;
  currentView?: string;
}

export default function DashboardLayout({ 
  sessionId, 
  initialMetrics, 
  processingStats, 
  quotaUsage,
  onBackToUpload,
  currentView = 'overview'
}: DashboardLayoutProps) {

  // Helper function to format watch time
  const formatWatchTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours}h ${remainingMinutes}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${remainingMinutes}m`;
    }
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 capitalize">
                  {currentView === 'videos' ? 'Video Library' : 
                   currentView === 'channels' ? 'Channel Analytics' :
                   currentView === 'categories' ? 'Category Breakdown' :
                   currentView === 'trends' ? 'Viewing Trends' :
                   currentView === 'export' ? 'Export Data' :
                   'Dashboard Overview'}
                </h1>
                <p className="text-sm text-gray-500">Session: {sessionId}</p>
              </div>

              <div className="flex items-center space-x-3">
                <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  <span>Export Data</span>
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Dashboard Views */}
        <DashboardViews 
          currentView={currentView}
          sessionId={sessionId}
          initialMetrics={initialMetrics}
        />
    </motion.div>
  );
}