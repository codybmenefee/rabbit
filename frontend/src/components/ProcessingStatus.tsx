'use client';

import { motion } from 'framer-motion';
import { 
  CpuChipIcon, 
  CheckCircleIcon, 
  ClockIcon,
  BeakerIcon,
  ChartBarIcon,
  GlobeAltIcon,
  DocumentTextIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

interface ProcessingStatusProps {
  progress: number;
  isComplete: boolean;
  uploadedFileName?: string;
  processingOptions: {
    enrichWithAPI: boolean;
    useScrapingService: boolean;
    useHighPerformanceService: boolean;
    useLLMService: boolean;
    selectedService: 'api' | 'scraping' | 'high-performance' | 'llm';
    forceReprocessing: boolean;
    includeAds: boolean;
    includeShorts: boolean;
  };
}

export default function ProcessingStatus({ 
  progress, 
  isComplete, 
  uploadedFileName,
  processingOptions
}: ProcessingStatusProps) {
  const getEnrichmentDescription = () => {
    if (!processingOptions.enrichWithAPI) {
      return "Skipping enrichment - using basic data only";
    }
    
    switch (processingOptions.selectedService) {
      case 'api':
        return "Fetching YouTube metadata via official API";
      case 'scraping':
        return "Extracting data via web scraping";
      case 'high-performance':
        return "High-speed parallel processing with worker threads";
      default:
        return "Fetching YouTube metadata";
    }
  };

  const processingSteps = [
    {
      id: 1,
      name: "Parsing HTML",
      description: "Extracting video entries from your watch history",
      icon: DocumentTextIcon,
      threshold: 20
    },
    {
      id: 2,
      name: "Data Validation",
      description: "Cleaning and validating video data",
      icon: BeakerIcon,
      threshold: 40
    },
    {
      id: 3,
      name: processingOptions.enrichWithAPI ? 
        `${processingOptions.selectedService === 'api' ? 'API' : 
          processingOptions.selectedService === 'high-performance' ? 'High-Performance' : 'Web'} Enrichment` : 
        "Basic Processing",
      description: getEnrichmentDescription(),
      icon: GlobeAltIcon,
      threshold: 70
    },
    {
      id: 4,
      name: "Analytics Generation",
      description: "Computing insights and trends",
      icon: ChartBarIcon,
      threshold: 90
    },
    {
      id: 5,
      name: "Finalizing",
      description: "Preparing your dashboard",
      icon: SparklesIcon,
      threshold: 100
    }
  ];

  const currentStep = processingSteps.find(step => progress < step.threshold) || processingSteps[processingSteps.length - 1];
  const completedSteps = processingSteps.filter(step => progress >= step.threshold);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto text-center"
    >
      {/* Header */}
      <div className="mb-12">
        <motion.div
          animate={{ 
            rotate: isComplete ? 0 : 360,
            scale: processingOptions.selectedService === 'high-performance' ? [1, 1.1, 1] : 1
          }}
          transition={{ 
            rotate: { duration: 2, repeat: isComplete ? 0 : Infinity, ease: "linear" },
            scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
          }}
          className="inline-block mb-6"
        >
          {isComplete ? (
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
          ) : (
            <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto ${
              processingOptions.selectedService === 'high-performance' 
                ? 'bg-purple-100' 
                : 'bg-blue-100'
            }`}>
              <CpuChipIcon className={`h-8 w-8 ${
                processingOptions.selectedService === 'high-performance' 
                  ? 'text-purple-600' 
                  : 'text-blue-600'
              }`} />
            </div>
          )}
        </motion.div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          {isComplete ? 'Analysis Complete!' : 'Processing Your Data'}
        </h1>

        {processingOptions.selectedService === 'high-performance' && !isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
          >
            <SparklesIcon className="h-3 w-3 mr-1" />
            High-Performance Mode Active
          </motion.div>
        )}
        
        <p className="text-lg text-gray-600 mb-2">
          {isComplete 
            ? 'Your YouTube analytics are ready to explore'
            : 'Analyzing your YouTube watch history...'
          }
        </p>

        {uploadedFileName && (
          <p className="text-sm text-gray-500">
            Processing: {uploadedFileName}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-12">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>{Math.round(progress)}% Complete</span>
          <span>{isComplete ? 'Done!' : currentStep.name}</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Processing Steps */}
      <div className="space-y-4 mb-12">
        {processingSteps.map((step, index) => {
          const isCurrentStep = currentStep.id === step.id;
          const isCompleted = completedSteps.some(s => s.id === step.id);
          const isUpcoming = progress < step.threshold;

          return (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`
                flex items-center space-x-4 p-4 rounded-lg border-2 transition-all duration-300
                ${isCurrentStep && !isComplete
                  ? 'border-blue-300 bg-blue-50'
                  : isCompleted || isComplete
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }
              `}
            >
              <div className={`
                flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center
                ${isCurrentStep && !isComplete
                  ? 'bg-blue-100'
                  : isCompleted || isComplete
                    ? 'bg-green-100'
                    : 'bg-gray-100'
                }
              `}>
                {isCompleted || isComplete ? (
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                ) : isCurrentStep ? (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  >
                    <step.icon className="h-5 w-5 text-blue-600" />
                  </motion.div>
                ) : (
                  <step.icon className="h-5 w-5 text-gray-400" />
                )}
              </div>

              <div className="flex-grow text-left">
                <h3 className={`
                  font-medium
                  ${isCurrentStep && !isComplete
                    ? 'text-blue-900'
                    : isCompleted || isComplete
                      ? 'text-green-900'
                      : 'text-gray-500'
                  }
                `}>
                  {step.name}
                </h3>
                <p className={`
                  text-sm
                  ${isCurrentStep && !isComplete
                    ? 'text-blue-600'
                    : isCompleted || isComplete
                      ? 'text-green-600'
                      : 'text-gray-400'
                  }
                `}>
                  {step.description}
                </p>
              </div>

              {isCurrentStep && !isComplete && (
                <motion.div
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="flex-shrink-0"
                >
                  <ClockIcon className="h-5 w-5 text-blue-500" />
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Processing Options Summary */}
      <div className="bg-gray-50 rounded-xl p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${processingOptions.enrichWithAPI ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className={processingOptions.enrichWithAPI ? 'text-gray-900' : 'text-gray-500'}>
              API Enrichment
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${processingOptions.includeShorts ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className={processingOptions.includeShorts ? 'text-gray-900' : 'text-gray-500'}>
              YouTube Shorts
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${processingOptions.includeAds ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className={processingOptions.includeAds ? 'text-gray-900' : 'text-gray-500'}>
              Advertisements
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`h-2 w-2 rounded-full ${processingOptions.forceReprocessing ? 'bg-orange-500' : 'bg-gray-300'}`} />
            <span className={processingOptions.forceReprocessing ? 'text-gray-900' : 'text-gray-500'}>
              Force Reprocessing
            </span>
          </div>
        </div>
      </div>

      {/* Success Animation */}
      {isComplete && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
          className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6"
        >
          <div className="flex items-center justify-center space-x-2 text-green-700 mb-2">
            <CheckCircleIcon className="h-5 w-5" />
            <span className="font-medium">Processing Completed Successfully</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Your dashboard will load automatically in a moment...
          </p>
          
          <div className="flex justify-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex space-x-1"
            >
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 bg-blue-500 rounded-full"
                  animate={{ y: [0, -4, 0] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1
                  }}
                />
              ))}
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Fun Facts */}
      {!isComplete && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6">
          <h4 className="font-medium text-gray-900 mb-2">💡 Did you know?</h4>
          <p className="text-sm text-gray-600">
            YouTube users watch over 1 billion hours of video daily. 
            Rabbit Analytics helps you understand your part of this massive digital landscape!
          </p>
        </div>
      )}
    </motion.div>
  );
}