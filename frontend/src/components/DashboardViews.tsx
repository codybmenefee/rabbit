'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ChartBarIcon,
  VideoCameraIcon,
  UsersIcon,
  TagIcon,
  ClockIcon,
  DocumentArrowDownIcon,
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface DashboardViewsProps {
  currentView: string;
  sessionId: string;
  initialMetrics: any;
}

interface VideoEntry {
  videoId: string;
  title: string;
  channel: string;
  watchedAt: string;
  url: string;
  contentType: string;
  category: string;
  duration?: number;
  viewCount?: number;
  likeCount?: number;
  commentCount?: number;
  enrichedWithAPI: boolean;
}

interface DatabaseStats {
  totalVideos: number;
  totalChannels: number;
  totalWatchTime: number;
  oldestWatch: string;
  newestWatch: string;
  topCategories: Array<{ category: string; count: number }>;
  topChannels: Array<{ channel: string; count: number }>;
}

export default function DashboardViews({ currentView, sessionId, initialMetrics }: DashboardViewsProps) {
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats | null>(null);
  const [databaseVideos, setDatabaseVideos] = useState<VideoEntry[]>([]);
  const [databaseMetrics, setDatabaseMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch database statistics
  const fetchDatabaseStats = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/analytics/database/stats`);
      if (response.data.success) {
        setDatabaseStats(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching database stats:', err);
      setError('Failed to load database statistics');
    } finally {
      setLoading(false);
    }
  };

  // Fetch database videos with pagination
  const fetchDatabaseVideos = async (page = 1, search = '', category = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy: 'watchedAt',
        sortOrder: 'desc'
      });

      if (search) params.append('search', search);
      if (category) params.append('category', category);

      const response = await axios.get(`${API_BASE_URL}/api/analytics/database/videos?${params}`);
      if (response.data.success) {
        setDatabaseVideos(response.data.data.videos);
        setTotalPages(response.data.data.pagination.totalPages);
        setCurrentPage(page);
      }
    } catch (err) {
      console.error('Error fetching database videos:', err);
      setError('Failed to load video data from database');
    } finally {
      setLoading(false);
    }
  };

  // Fetch database metrics
  const fetchDatabaseMetrics = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/api/analytics/database/metrics`);
      if (response.data.success) {
        setDatabaseMetrics(response.data.data.metrics);
      }
    } catch (err) {
      console.error('Error fetching database metrics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  // Load data when view changes
  useEffect(() => {
    setError(null);
    
    switch (currentView) {
      case 'overview':
      case 'analytics':
        fetchDatabaseStats();
        fetchDatabaseMetrics();
        break;
      case 'videos':
        fetchDatabaseVideos(1, searchTerm, selectedCategory);
        break;
      case 'channels':
      case 'categories':
      case 'trends':
        fetchDatabaseStats();
        break;
    }
  }, [currentView]);

  // Handle search and filters
  useEffect(() => {
    if (currentView === 'videos') {
      const debounceTimer = setTimeout(() => {
        fetchDatabaseVideos(1, searchTerm, selectedCategory);
      }, 500);
      return () => clearTimeout(debounceTimer);
    }
  }, [searchTerm, selectedCategory]);

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

  const exportData = async (format: 'json' | 'csv') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/analytics/export?sessionId=${sessionId}&format=${format}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `youtube-analytics-${sessionId}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed');
    }
  };

  // Render loading state
  if (loading && !databaseStats && !databaseVideos.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-red-600 mr-3">⚠️</div>
          <div>
            <h3 className="font-medium text-red-800">Error Loading Data</h3>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Overview View
  if (currentView === 'overview') {
    const stats = databaseStats || initialMetrics;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-blue-100 rounded-lg p-2 mr-4">
                <VideoCameraIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Videos</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalVideos?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-green-100 rounded-lg p-2 mr-4">
                <ClockIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Watch Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalWatchTime ? 
                    formatWatchTime(stats.totalWatchTime) : 
                    '0m'
                  }
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-purple-100 rounded-lg p-2 mr-4">
                <UsersIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Channels</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.totalChannels?.toLocaleString() || '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <div className="bg-orange-100 rounded-lg p-2 mr-4">
                <TagIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.topCategories?.length || '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Channels and Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Channels</h3>
            <div className="space-y-3">
              {(stats?.topChannels || databaseMetrics?.mostWatchedChannels || []).slice(0, 5).map((channel: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate">{channel.channel}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {channel.count} videos
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Categories</h3>
            <div className="space-y-3">
              {(stats?.topCategories || databaseMetrics?.categories || []).slice(0, 5).map((category: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{category.category}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${category.percentage || (category.count / stats?.totalVideos) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900">
                      {category.count || category.percentage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Videos View
  if (currentView === 'videos') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search videos and channels..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Education">Education</option>
                <option value="Music">Music</option>
                <option value="Gaming">Gaming</option>
                <option value="News">News</option>
                <option value="Sports">Sports</option>
                <option value="Technology">Technology</option>
              </select>
            </div>
          </div>
        </div>

        {/* Videos Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Video Library</h3>
            <p className="text-sm text-gray-500">Browse your YouTube watch history</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Video
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Channel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Watched
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {databaseVideos.map((video, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 bg-gray-200 rounded-lg flex items-center justify-center">
                            <VideoCameraIcon className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {video.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {video.contentType} • {video.enrichedWithAPI ? 'Enhanced' : 'Basic'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{video.channel}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        {video.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(video.watchedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => fetchDatabaseVideos(currentPage - 1, searchTerm, selectedCategory)}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchDatabaseVideos(currentPage + 1, searchTerm, selectedCategory)}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Export View
  if (currentView === 'export') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <DocumentArrowDownIcon className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-4">Export Your Data</h3>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            Download your YouTube analytics data in various formats for further analysis or backup.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md mx-auto">
            <button
              onClick={() => exportData('json')}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Export JSON</span>
            </button>
            
            <button
              onClick={() => exportData('csv')}
              className="flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ArrowDownTrayIcon className="h-5 w-5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Placeholder for other views
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center"
    >
      <ChartBarIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">{currentView} View</h3>
      <p className="text-gray-600">This view is coming soon!</p>
    </motion.div>
  );
}