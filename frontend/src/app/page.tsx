'use client';

import { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import MetricsDisplay from '../components/MetricsDisplay';
import VideoTable from '../components/VideoTable';

// API base URL - defaults to localhost:5000, but can be overridden by environment variables
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function Home() {
  const [metrics, setMetrics] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'metrics' | 'table'>('metrics');

  // Automatically check connection on page load
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      const data = await response.text();
      setIsConnected(true);
      setError(null);
    } catch (error) {
      setIsConnected(false);
      setError(`Failed to connect to backend. Make sure the server is running on port 5000.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (data: any) => {
    setMetrics(data.metrics);
    setError(null);
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'metrics' ? 'table' : 'metrics');
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-8 md:p-24">
      <h1 className="text-4xl font-bold mb-8">YouTube Watch History Analytics</h1>
      
      {isConnected === false && (
        <div className="mb-8 p-2 text-center bg-red-50 text-red-700 border border-red-200 rounded">
          ❌ Not connected to backend
        </div>
      )}
      
      {error && (
        <div className="mb-8 p-4 bg-red-50 text-red-600 border border-red-200 rounded">
          <p>{error}</p>
        </div>
      )}
      
      {isConnected === null && (
        <div className="mb-8 flex items-center justify-center">
          <button 
            onClick={checkBackendConnection}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isLoading ? "Checking connection..." : "Check Backend Connection"}
          </button>
        </div>
      )}
      
      {isConnected === true && (
        <>
          <div className="mb-10">
            <h2 className="text-2xl font-semibold mb-4 text-center">Upload Your Watch History</h2>
            <p className="text-gray-600 mb-4 text-center">
              Upload your HTML watch history file exported from YouTube
            </p>
            <FileUpload onSuccess={handleUploadSuccess} onError={handleUploadError} apiBaseUrl={API_BASE_URL} />
          </div>
          
          {metrics && (
            <>
              <div className="mb-6 flex justify-center">
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    onClick={() => setViewMode('metrics')}
                    className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                      viewMode === 'metrics' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Analytics Dashboard
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                      viewMode === 'table' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    Data Table
                  </button>
                </div>
              </div>
              
              {viewMode === 'metrics' ? (
                <MetricsDisplay metrics={metrics} />
              ) : (
                <VideoTable apiBaseUrl={API_BASE_URL} />
              )}
            </>
          )}
        </>
      )}
    </main>
  );
} 