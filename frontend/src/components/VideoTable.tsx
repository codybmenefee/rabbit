'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import logger from '@/utils/logger';

interface VideoEntry {
  title: string;
  channelName: string;
  watchDate: string;
  url: string;
  durationSeconds?: number;
  contentType: 'standard' | 'short' | 'ad';
}

interface VideoTableProps {
  apiBaseUrl: string;
}

export default function VideoTable({ apiBaseUrl }: VideoTableProps) {
  const [entries, setEntries] = useState<VideoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [includeAds, setIncludeAds] = useState(false);
  const [includeShorts, setIncludeShorts] = useState(false);
  
  // Format duration in seconds to MM:SS
  const formatDuration = (durationSeconds?: number): string => {
    if (!durationSeconds) return '--:--';
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Format date
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch {
      return dateString;
    }
  };
  
  // Get content type label
  const getContentTypeLabel = (type: string): string => {
    switch (type) {
      case 'standard':
        return 'Video';
      case 'short':
        return 'Short';
      case 'ad':
        return 'Ad';
      default:
        return type;
    }
  };
  
  // Fetch video entries
  const fetchEntries = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/analytics/entries?includeAds=${includeAds}&includeShorts=${includeShorts}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch video entries');
      }
      
      const data = await response.json();
      setEntries(data.entries);
    } catch (err) {
      setError('Error loading video entries. Please try again.');
      logger.error('Error loading video entries', err as Error, {
        category: 'data_loading_error',
        endpoint: '/api/analytics/entries'
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Load entries when component mounts or filters change
  useEffect(() => {
    fetchEntries();
  }, [includeAds, includeShorts]);
  
  // Handle filter changes
  const handleFilterChange = (filter: 'ads' | 'shorts') => {
    if (filter === 'ads') {
      setIncludeAds(!includeAds);
    } else {
      setIncludeShorts(!includeShorts);
    }
  };
  
  return (
    <div className="w-full max-w-6xl">
      <h2 className="text-2xl font-bold mb-6">Video Watch History</h2>
      
      {/* Filter Controls */}
      <div className="mb-4 flex gap-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={includeAds}
            onChange={() => handleFilterChange('ads')}
            className="mr-2"
          />
          Include Ads
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={includeShorts}
            onChange={() => handleFilterChange('shorts')}
            className="mr-2"
          />
          Include Shorts
        </label>
      </div>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded border border-red-200">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="text-center p-4">Loading videos...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Video Title
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Channel
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Watch Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                    No videos found
                  </td>
                </tr>
              ) : (
                entries.map((entry, index) => (
                  <tr key={index} className={entry.contentType === 'ad' ? 'bg-red-50' : entry.contentType === 'short' ? 'bg-blue-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={entry.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline truncate block max-w-xs"
                      >
                        {entry.title}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {entry.channelName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDate(entry.watchDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {formatDuration(entry.durationSeconds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs ${
                        entry.contentType === 'standard' ? 'bg-green-100 text-green-800' : 
                        entry.contentType === 'short' ? 'bg-blue-100 text-blue-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        {getContentTypeLabel(entry.contentType)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 