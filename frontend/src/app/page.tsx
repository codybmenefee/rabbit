'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloudArrowUpIcon, 
  ChartBarIcon, 
  Cog6ToothIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { useDropzone } from 'react-dropzone';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

// Components
import TakeoutGuide from '../components/TakeoutGuide';
import ProcessingStatus from '../components/ProcessingStatus';
import DashboardLayout from '../components/DashboardLayout';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type EnrichmentService = 'api' | 'scraping' | 'high-performance';

interface ProcessingOptions {
  enrichWithAPI: boolean;
  useScrapingService: boolean;
  useHighPerformanceService: boolean;
  selectedService: EnrichmentService;
  forceReprocessing: boolean;
  includeAds: boolean;
  includeShorts: boolean;
}

interface UploadResponse {
  success: boolean;
  sessionId: string;
  metrics: any;
  processingStats: any;
  summary: any;
  quotaUsage?: any;
}

export default function HomePage() {
  // State management
  const [step, setStep] = useState<'guide' | 'upload' | 'processing' | 'dashboard'>('guide');
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [processingOptions, setProcessingOptions] = useState<ProcessingOptions>({
    enrichWithAPI: true,
    useScrapingService: false,
    useHighPerformanceService: false,
    selectedService: 'api' as EnrichmentService,
    forceReprocessing: false,
    includeAds: false,
    includeShorts: true
  });
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Check backend connection on mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      setIsConnected(true);
      toast.success('Connected to Rabbit Analytics API');
    } catch (error) {
      setIsConnected(false);
      toast.error('Failed to connect to backend. Please ensure the server is running.');
      console.error('Connection error:', error);
    }
  };

  // File upload handling
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file
    if (!file.name.toLowerCase().includes('watch-history') && !file.name.toLowerCase().includes('watch_history')) {
      toast.error('Please upload your YouTube watch history file (should contain "watch-history" in the name)');
      return;
    }

    if (file.size > 100 * 1024 * 1024) { // 100MB limit
      toast.error('File size too large. Please ensure your watch history file is under 100MB.');
      return;
    }

    setUploadedFile(file);
    toast.success(`File "${file.name}" ready for processing`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/html': ['.html'],
      'application/zip': ['.zip']
    },
    multiple: false,
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  // Poll for processing progress
  const pollProgress = async (sessionId: string) => {
    const maxAttempts = 600; // 5 minutes max (600 * 0.5s = 5min)
    let attempts = 0;
    
    const progressInterval = setInterval(async () => {
      attempts++;
      
      try {
        const response = await axios.get(`${API_BASE_URL}/api/analytics/progress/${sessionId}`);
        
        if (response.data.success && response.data.progress) {
          const progress = response.data.progress;
          setProcessingProgress(progress.progress);
          
          if (progress.isComplete || progress.error) {
            clearInterval(progressInterval);
            
            if (progress.error) {
              toast.error(`Processing failed: ${progress.error}`);
              setStep('upload');
            } else {
              setProcessingProgress(100);
              toast.success('Processing completed successfully!');
              
              // Get the final result
              try {
                const resultResponse = await axios.get(`${API_BASE_URL}/api/analytics/metrics/${sessionId}`);
                if (resultResponse.data.success) {
                  setUploadResponse({
                    success: true,
                    sessionId: sessionId,
                    metrics: resultResponse.data.metrics,
                    processingStats: resultResponse.data.processingStats,
                    summary: resultResponse.data.summary,
                    quotaUsage: resultResponse.data.quotaUsage
                  });
                  
                  setTimeout(() => {
                    setStep('dashboard');
                  }, 1500);
                }
              } catch (resultError) {
                console.error('Error fetching results:', resultError);
                toast.error('Processing completed but failed to load results');
                setStep('upload');
              }
            }
            setIsProcessing(false);
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error);
        // Don't clear interval on error - keep trying
      }
      
      // Timeout after max attempts
      if (attempts >= maxAttempts) {
        clearInterval(progressInterval);
        toast.error('Processing timeout - please try again');
        setStep('upload');
        setIsProcessing(false);
      }
    }, 500); // Poll every 500ms
  };

  // Process uploaded file
  const processFile = async () => {
    if (!uploadedFile) {
      toast.error('Please select a file first');
      return;
    }

    if (!isConnected) {
      toast.error('Not connected to backend. Please check your connection.');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setStep('processing');

    try {
      // Read file content
      const fileContent = await readFileAsText(uploadedFile);
      
      // Debug: Log current processing options before transformation
      console.log('🔍 Frontend Debug: Current processingOptions:', processingOptions);
      
      // Transform processing options to match backend API
      const apiOptions = {
        enrichWithAPI: processingOptions.enrichWithAPI,
        useScrapingService: processingOptions.selectedService === 'scraping',
        useHighPerformanceService: processingOptions.selectedService === 'high-performance',
        forceReprocessing: processingOptions.forceReprocessing,
        includeAds: processingOptions.includeAds,
        includeShorts: processingOptions.includeShorts
      };

      console.log('🔍 Frontend Debug: Transformed apiOptions:', apiOptions);
      console.log('🔍 Frontend Debug: forceReprocessing value:', processingOptions.forceReprocessing);

      // Start processing
      const response = await axios.post(`${API_BASE_URL}/api/analytics/upload`, {
        htmlContent: fileContent,
        options: apiOptions
      }, {
        timeout: 300000, // 5 minute timeout
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.data.success) {
        // If we get an immediate response, processing is complete
        setUploadResponse(response.data);
        setProcessingProgress(100);
        toast.success('Processing completed successfully!');
        
        setTimeout(() => {
          setStep('dashboard');
        }, 1500);
        setIsProcessing(false);
      } else {
        throw new Error(response.data.message || 'Processing failed');
      }

    } catch (error: any) {
      console.error('Processing error:', error);
      
      // Check if this is because of async processing (session ID returned)
      if (error.response?.data?.sessionId) {
        // Start polling for progress
        toast.loading('Processing started - tracking progress...');
        pollProgress(error.response.data.sessionId);
      } else {
        // Handle regular errors
        if (error.code === 'ECONNABORTED') {
          toast.error('Processing timeout. Your file might be too large or complex.');
        } else if (error.response?.status === 413) {
          toast.error('File too large. Please try a smaller watch history file.');
        } else {
          toast.error(error.response?.data?.message || 'Failed to process file. Please try again.');
        }
        
        setStep('upload');
        setIsProcessing(false);
      }
    }
  };

  // Utility function to read file as text
  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  };

  // Render different steps
  const renderCurrentStep = () => {
    switch (step) {
      case 'guide':
        return (
          <TakeoutGuide
            onContinue={() => setStep('upload')}
            isConnected={isConnected}
            onRetryConnection={checkBackendConnection}
          />
        );

      case 'upload':
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl mx-auto"
          >
            {/* Header */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <CloudArrowUpIcon className="h-8 w-8 text-blue-600" />
                <h1 className="text-3xl font-bold text-gray-900">
                  Upload Your Watch History
                </h1>
              </div>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Upload your YouTube watch history HTML file from Google Takeout to start analyzing your viewing patterns.
              </p>
            </div>

            {/* Connection Status */}
            {isConnected === false && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8"
              >
                <div className="flex items-center">
                  <XCircleIcon className="h-5 w-5 text-red-400 mr-2" />
                  <span className="text-red-800">
                    Backend connection failed. Please ensure the server is running.
                  </span>
                  <button
                    onClick={checkBackendConnection}
                    className="ml-auto px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
                  >
                    Retry
                  </button>
                </div>
              </motion.div>
            )}

            {/* Processing Options */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Cog6ToothIcon className="h-5 w-5 mr-2" />
                Processing Options
              </h3>
              
              <div className="space-y-6">
                {/* Enrichment Service Selection */}
                <div>
                  <label className="flex items-start space-x-3 mb-3">
                    <input
                      type="checkbox"
                      checked={processingOptions.enrichWithAPI}
                      onChange={(e) => setProcessingOptions(prev => ({
                        ...prev,
                        enrichWithAPI: e.target.checked
                      }))}
                      className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        Enable video enrichment
                      </span>
                      <p className="text-sm text-gray-500">
                        Fetch additional metadata like video categories, view counts, and durations.
                      </p>
                    </div>
                  </label>

                  {/* Service Type Selection */}
                  {processingOptions.enrichWithAPI && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="ml-7 space-y-3 border-l-2 border-gray-100 pl-4"
                    >
                      <p className="text-sm font-medium text-gray-700 mb-2">Choose enrichment service:</p>
                      
                      <label className="flex items-start space-x-3">
                        <input
                          type="radio"
                          name="enrichmentService"
                          checked={processingOptions.selectedService === 'api'}
                          onChange={() => setProcessingOptions(prev => ({
                            ...prev,
                            selectedService: 'api',
                            useScrapingService: false,
                            useHighPerformanceService: false
                          }))}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800">
                            YouTube API <span className="text-green-600 text-xs">(RECOMMENDED)</span>
                          </span>
                          <p className="text-sm text-gray-500">
                            Fast and accurate using official YouTube Data API. Requires API key.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3">
                        <input
                          type="radio"
                          name="enrichmentService"
                          checked={processingOptions.selectedService === 'scraping'}
                          onChange={() => setProcessingOptions(prev => ({
                            ...prev,
                            selectedService: 'scraping',
                            useScrapingService: true,
                            useHighPerformanceService: false
                          }))}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800">
                            Web Scraping <span className="text-amber-600 text-xs">(SLOWER)</span>
                          </span>
                          <p className="text-sm text-gray-500">
                            No API key required but slower processing. Good fallback option.
                          </p>
                        </div>
                      </label>

                      <label className="flex items-start space-x-3">
                        <input
                          type="radio"
                          name="enrichmentService"
                          checked={processingOptions.selectedService === 'high-performance'}
                          onChange={() => setProcessingOptions(prev => ({
                            ...prev,
                            selectedService: 'high-performance',
                            useScrapingService: false,
                            useHighPerformanceService: true
                          }))}
                          className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-800">
                            High-Performance Scraping <span className="text-purple-600 text-xs">(EXPERIMENTAL)</span>
                          </span>
                          <p className="text-sm text-gray-500">
                            Parallel processing with worker threads. Fastest scraping option for large datasets.
                          </p>
                        </div>
                      </label>
                    </motion.div>
                  )}
                </div>

                {/* Content Filters */}
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Content filters:</p>
                  
                  <div className="space-y-3">
                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={processingOptions.includeShorts}
                        onChange={(e) => setProcessingOptions(prev => ({
                          ...prev,
                          includeShorts: e.target.checked
                        }))}
                        className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Include YouTube Shorts
                        </span>
                        <p className="text-sm text-gray-500">
                          Include short-form videos in your analytics.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={processingOptions.includeAds}
                        onChange={(e) => setProcessingOptions(prev => ({
                          ...prev,
                          includeAds: e.target.checked
                        }))}
                        className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Include advertisements
                        </span>
                        <p className="text-sm text-gray-500">
                          Include ads and sponsored content in your analytics.
                        </p>
                      </div>
                    </label>

                    <label className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={processingOptions.forceReprocessing}
                        onChange={(e) => {
                          console.log('🔍 Force reprocessing checkbox clicked:', e.target.checked);
                          setProcessingOptions(prev => {
                            const newOptions = {
                              ...prev,
                              forceReprocessing: e.target.checked
                            };
                            console.log('🔍 Updated processingOptions:', newOptions);
                            return newOptions;
                          });
                        }}
                        className="mt-1 h-4 w-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">
                          Force reprocess all videos
                        </span>
                        <p className="text-sm text-gray-500">
                          Reprocess all videos, even if they already exist in the database. Use for high-performance scraping mode.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Service Status Indicator */}
              {processingOptions.enrichWithAPI && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 p-3 rounded-lg border-l-4 ${
                    processingOptions.selectedService === 'api' 
                      ? 'bg-green-50 border-green-400' 
                      : processingOptions.selectedService === 'high-performance'
                      ? 'bg-purple-50 border-purple-400'
                      : 'bg-amber-50 border-amber-400'
                  }`}
                >
                  <div className="flex items-center">
                    <div className={`h-2 w-2 rounded-full mr-2 ${
                      processingOptions.selectedService === 'api' 
                        ? 'bg-green-500' 
                        : processingOptions.selectedService === 'high-performance'
                        ? 'bg-purple-500'
                        : 'bg-amber-500'
                    }`} />
                    <span className="text-sm font-medium">
                      {processingOptions.selectedService === 'api' && 'YouTube API selected'}
                      {processingOptions.selectedService === 'scraping' && 'Web Scraping selected'}
                      {processingOptions.selectedService === 'high-performance' && 'High-Performance Scraping selected'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1 ml-4">
                    {processingOptions.selectedService === 'api' && 'Fastest and most accurate enrichment method'}
                    {processingOptions.selectedService === 'scraping' && 'No API key required, but processing will be slower'}
                    {processingOptions.selectedService === 'high-performance' && 'Experimental parallel processing - best for large datasets'}
                  </p>
                </motion.div>
              )}
            </div>

            {/* File Upload Area */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive 
                    ? 'border-blue-400 bg-blue-50' 
                    : uploadedFile 
                      ? 'border-green-400 bg-green-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <input {...getInputProps()} />
                
                {uploadedFile ? (
                  <div className="space-y-2">
                    <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto" />
                    <p className="text-lg font-medium text-green-900">
                      {uploadedFile.name}
                    </p>
                    <p className="text-sm text-green-600">
                      {(uploadedFile.size / (1024 * 1024)).toFixed(1)} MB • Ready to process
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto" />
                    <p className="text-lg font-medium text-gray-900">
                      {isDragActive ? 'Drop your file here' : 'Drop your watch history file here'}
                    </p>
                    <p className="text-sm text-gray-500">
                      or click to browse your computer
                    </p>
                    <p className="text-xs text-gray-400">
                      Supports HTML files up to 100MB
                    </p>
                  </div>
                )}
              </div>

              {uploadedFile && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 flex items-center justify-between"
                >
                  <button
                    onClick={() => setUploadedFile(null)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Choose different file
                  </button>
                  
                  <button
                    onClick={processFile}
                    disabled={!isConnected || isProcessing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  >
                    <ChartBarIcon className="h-4 w-4" />
                    <span>
                      {processingOptions.enrichWithAPI 
                        ? `Start Analysis (${
                            processingOptions.selectedService === 'api' ? 'API' :
                            processingOptions.selectedService === 'high-performance' ? 'High-Perf' :
                            'Scraping'
                          })`
                        : 'Start Analysis (Basic)'
                      }
                    </span>
                  </button>
                </motion.div>
              )}
            </div>

            {/* Back to Guide */}
            <div className="mt-8 text-center">
              <button
                onClick={() => setStep('guide')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Back to Setup Guide
              </button>
            </div>
          </motion.div>
        );

      case 'processing':
        return (
          <ProcessingStatus
            progress={processingProgress}
            isComplete={processingProgress >= 100}
            uploadedFileName={uploadedFile?.name}
            processingOptions={processingOptions}
          />
        );

      case 'dashboard':
        return uploadResponse && (
          <DashboardLayout
            sessionId={uploadResponse.sessionId}
            initialMetrics={uploadResponse.metrics}
            processingStats={uploadResponse.processingStats}
            quotaUsage={uploadResponse.quotaUsage}
            onBackToUpload={() => {
              setStep('upload');
              setUploadedFile(null);
              setUploadResponse(null);
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🐰</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Rabbit Analytics</h1>
                <p className="text-sm text-gray-500">YouTube Watch History Intelligence</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Connection Status Indicator */}
              <div className="flex items-center space-x-2">
                <div className={`h-2 w-2 rounded-full ${
                  isConnected === true ? 'bg-green-500' : 
                  isConnected === false ? 'bg-red-500' : 
                  'bg-yellow-500'
                }`} />
                <span className="text-sm text-gray-600">
                  {isConnected === true ? 'Connected' : 
                   isConnected === false ? 'Disconnected' : 
                   'Connecting...'}
                </span>
              </div>

              {/* Step Indicator */}
              <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
                <span className={step === 'guide' ? 'text-blue-600 font-medium' : ''}>
                  Guide
                </span>
                <span>→</span>
                <span className={step === 'upload' ? 'text-blue-600 font-medium' : ''}>
                  Upload
                </span>
                <span>→</span>
                <span className={step === 'processing' ? 'text-blue-600 font-medium' : ''}>
                  Process
                </span>
                <span>→</span>
                <span className={step === 'dashboard' ? 'text-blue-600 font-medium' : ''}>
                  Analyze
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {renderCurrentStep()}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-gray-200 bg-white/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>© 2024 Rabbit Analytics. Transform your YouTube data into actionable insights.</p>
            <div className="mt-2 flex items-center justify-center space-x-4">
              <a href="#" className="hover:text-gray-700">Privacy</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-700">Terms</a>
              <span>•</span>
              <a href="#" className="hover:text-gray-700">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 