'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ChevronRightIcon,
  ChevronLeftIcon,
  PlayIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  FolderOpenIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  ClockIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

interface TakeoutGuideProps {
  onContinue: () => void;
  isConnected: boolean | null;
  onRetryConnection: () => void;
}

interface GuideStep {
  id: number;
  title: string;
  description: string;
  content: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  estimatedTime?: string;
}

export default function TakeoutGuide({ onContinue, isConnected, onRetryConnection }: TakeoutGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps: GuideStep[] = [
    {
      id: 1,
      title: "Visit Google Takeout",
      description: "Start by navigating to Google's data export service",
      estimatedTime: "1 minute",
      icon: GlobeAltIcon,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Getting Started</h4>
            <p className="text-blue-800 mb-3">
              Google Takeout allows you to export your data from Google services, including your YouTube watch history.
            </p>
            <a
              href="https://takeout.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <GlobeAltIcon className="h-4 w-4 mr-2" />
              Open Google Takeout
            </a>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h5 className="font-medium text-gray-900 mb-2">What You'll Need:</h5>
            <ul className="text-sm text-gray-600 space-y-1">
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                A Google account with YouTube activity
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                About 5-10 minutes of time
              </li>
              <li className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                Enough storage space for the export file
              </li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 2,
      title: "Select YouTube Data",
      description: "Choose which YouTube data to export",
      estimatedTime: "2 minutes",
      icon: DocumentTextIcon,
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-900 mb-2">Important Step</h4>
            <p className="text-yellow-800 text-sm mb-3">
              By default, Google Takeout selects ALL your data. You only need YouTube data for Rabbit Analytics.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-blue-100 rounded-full p-1">
                <span className="text-blue-600 font-bold text-xs px-1">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Click "Deselect all"</p>
                <p className="text-sm text-gray-600">This will uncheck all Google services</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-blue-100 rounded-full p-1">
                <span className="text-blue-600 font-bold text-xs px-1">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Find "YouTube and YouTube Music"</p>
                <p className="text-sm text-gray-600">Scroll down or use Ctrl+F to search for YouTube</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-blue-100 rounded-full p-1">
                <span className="text-blue-600 font-bold text-xs px-1">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Check the YouTube checkbox</p>
                <p className="text-sm text-gray-600">This will select YouTube data for export</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 3,
      title: "Configure Export Format",
      description: "Set the correct format for your watch history",
      estimatedTime: "2 minutes",
      icon: Cog6ToothIcon,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Critical Configuration</h4>
            <p className="text-green-800 text-sm">
              The format you choose determines how Rabbit Analytics can process your data.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-green-100 rounded-full p-1">
                <span className="text-green-600 font-bold text-xs px-1">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Click "Multiple formats" next to YouTube</p>
                <p className="text-sm text-gray-600">This opens the format selection dialog</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-green-100 rounded-full p-1">
                <span className="text-green-600 font-bold text-xs px-1">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Find "history" section</p>
                <p className="text-sm text-gray-600">Look for the watch history option</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-green-100 rounded-full p-1">
                <span className="text-green-600 font-bold text-xs px-1">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Select "HTML" format</p>
                <p className="text-sm text-gray-600">This ensures Rabbit Analytics can parse your data</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-green-100 rounded-full p-1">
                <span className="text-green-600 font-bold text-xs px-1">4</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Click "OK" to save settings</p>
                <p className="text-sm text-gray-600">Your format preferences are now configured</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 4,
      title: "Create Export",
      description: "Initiate the data export process",
      estimatedTime: "1 minute",
      icon: PlayIcon,
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-medium text-purple-900 mb-2">Export Configuration</h4>
            <p className="text-purple-800 text-sm">
              These settings determine how your export will be delivered.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">Delivery Method</h5>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <CheckCircleIcon className="h-4 w-4 text-green-500" />
                  <span className="text-gray-700">Email link (Recommended)</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="h-4 w-4 text-gray-400">○</span>
                  <span className="text-gray-500">Add to Drive</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="h-4 w-4 text-gray-400">○</span>
                  <span className="text-gray-500">Add to Dropbox</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">Export Settings</h5>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Frequency:</strong> Export once</p>
                <p><strong>File type:</strong> .zip or .tgz</p>
                <p><strong>Size:</strong> Any size is fine</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>Next:</strong> Click "Create export" button to start the process. 
              You'll receive an email when your export is ready.
            </p>
          </div>
        </div>
      )
    },
    {
      id: 5,
      title: "Download & Extract",
      description: "Get your exported data ready for analysis",
      estimatedTime: "Variable",
      icon: ArrowDownTrayIcon,
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <ClockIcon className="h-5 w-5 text-orange-600 mr-2" />
              <h4 className="font-medium text-orange-900">Processing Time</h4>
            </div>
            <p className="text-orange-800 text-sm">
              Google Takeout processing can take anywhere from a few minutes to several hours, 
              depending on how much YouTube data you have.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-orange-100 rounded-full p-1">
                <span className="text-orange-600 font-bold text-xs px-1">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Wait for email notification</p>
                <p className="text-sm text-gray-600">You'll receive an email from Google when ready</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-orange-100 rounded-full p-1">
                <span className="text-orange-600 font-bold text-xs px-1">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Download the archive</p>
                <p className="text-sm text-gray-600">Click the download link in your email</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-orange-100 rounded-full p-1">
                <span className="text-orange-600 font-bold text-xs px-1">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Extract the archive</p>
                <p className="text-sm text-gray-600">Unzip the downloaded file to access your data</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-orange-100 rounded-full p-1">
                <span className="text-orange-600 font-bold text-xs px-1">4</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Locate watch-history.html</p>
                <p className="text-sm text-gray-600">Navigate to YouTube/history/watch-history.html</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-medium text-blue-900 mb-2">File Structure Example:</h5>
            <div className="font-mono text-sm text-blue-800 space-y-1">
              <div>📁 takeout-20241201-123456</div>
              <div className="ml-4">📁 YouTube and YouTube Music</div>
              <div className="ml-8">📁 history</div>
              <div className="ml-12">📄 <strong>watch-history.html</strong> ← This file!</div>
              <div className="ml-8">📁 playlists</div>
              <div className="ml-8">📁 subscriptions</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 6,
      title: "Upload to Rabbit",
      description: "Upload your watch history file for analysis",
      estimatedTime: "1 minute",
      icon: CloudArrowUpIcon,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <h4 className="font-medium text-green-900">You're Almost Ready!</h4>
            </div>
            <p className="text-green-800 text-sm">
              Once you have your watch-history.html file, you can upload it to Rabbit Analytics 
              for comprehensive analysis of your YouTube viewing patterns.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-green-100 rounded-full p-1">
                <span className="text-green-600 font-bold text-xs px-1">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Click "Continue to Upload"</p>
                <p className="text-sm text-gray-600">This will take you to the upload interface</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-green-100 rounded-full p-1">
                <span className="text-green-600 font-bold text-xs px-1">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Configure processing options</p>
                <p className="text-sm text-gray-600">Choose whether to include ads, shorts, and API enrichment</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-green-100 rounded-full p-1">
                <span className="text-green-600 font-bold text-xs px-1">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Upload your watch-history.html file</p>
                <p className="text-sm text-gray-600">Drag and drop or click to select the file</p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-3 bg-white border rounded-lg">
              <div className="bg-green-100 rounded-full p-1">
                <span className="text-green-600 font-bold text-xs px-1">4</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Start your analysis</p>
                <p className="text-sm text-gray-600">Rabbit Analytics will process your data and show insights</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h5 className="font-medium text-purple-900 mb-2">What You'll Discover:</h5>
            <ul className="text-sm text-purple-800 space-y-1">
              <li>• Total watch time and video counts</li>
              <li>• Your top channels and content categories</li>
              <li>• Viewing patterns by time of day and day of week</li>
              <li>• Content trends over time</li>
              <li>• Detailed video-by-video breakdown</li>
            </ul>
          </div>
        </div>
      )
    }
  ];

  const markStepComplete = (stepIndex: number) => {
    setCompletedSteps(prev => new Set([...Array.from(prev), stepIndex]));
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      markStepComplete(currentStep);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = steps[currentStep];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="text-center mb-12">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <FolderOpenIcon className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            How to Export Your YouTube Data
          </h1>
        </div>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Follow this step-by-step guide to export your YouTube watch history from Google Takeout. 
          The process takes about 10 minutes plus processing time.
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
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">
              Backend connection failed. Please ensure the server is running before proceeding.
            </span>
            <button
              onClick={onRetryConnection}
              className="ml-auto px-3 py-1 bg-red-100 text-red-800 rounded text-sm hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </motion.div>
      )}

      {/* Progress Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <span>Estimated time: {currentStepData.estimatedTime}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step Navigation Pills */}
      <div className="flex justify-center mb-8">
        <div className="flex space-x-2 bg-gray-100 rounded-lg p-1">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`
                flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${index === currentStep
                  ? 'bg-white text-blue-600 shadow-sm'
                  : completedSteps.has(index)
                    ? 'text-green-600 hover:bg-white/50'
                    : 'text-gray-500 hover:bg-white/50'
                }
              `}
            >
              <step.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{step.title}</span>
              {completedSteps.has(index) && (
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8"
      >
        <div className="flex items-center space-x-3 mb-6">
          <div className="bg-blue-100 rounded-lg p-2">
            <currentStepData.icon className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {currentStepData.title}
            </h2>
            <p className="text-gray-600">
              {currentStepData.description}
            </p>
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          {currentStepData.content}
        </div>
      </motion.div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeftIcon className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <div className="flex items-center space-x-4">
          {currentStep === steps.length - 1 ? (
            <button
              onClick={onContinue}
              disabled={isConnected === false}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CloudArrowUpIcon className="h-4 w-4" />
              <span>Continue to Upload</span>
            </button>
          ) : (
            <button
              onClick={nextStep}
              className="flex items-center space-x-2 px-4 py-2 text-blue-600 hover:text-blue-700"
            >
              <span>Next</span>
              <ChevronRightIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Summary */}
      <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Summary</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-900 mb-1">Total Time</h4>
            <p className="text-gray-600">~10 minutes + processing</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-1">File Location</h4>
            <p className="text-gray-600">YouTube/history/watch-history.html</p>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-1">File Format</h4>
            <p className="text-gray-600">HTML (required for Rabbit)</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}