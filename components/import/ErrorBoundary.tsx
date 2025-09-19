'use client'

import React from 'react'
import { AlertCircle, RefreshCw, Upload } from 'lucide-react'

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ImportErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Import Error Boundary caught an error:', error, errorInfo)
    
    // In a real app, you might want to log this to an error reporting service
    // logErrorToService(error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />
      }

      return <ImportErrorFallback error={this.state.error!} resetError={this.resetError} />
    }

    return this.props.children
  }
}

interface ImportErrorFallbackProps {
  error: Error
  resetError: () => void
}

function ImportErrorFallback({ error, resetError }: ImportErrorFallbackProps) {
  const getErrorMessage = (error: Error) => {
    // Provide user-friendly messages for common import errors
    if (error.message.includes('DOMParser')) {
      return 'The uploaded file appears to be corrupted or in an unexpected format. Please ensure you\'ve uploaded the correct watch-history.html file from Google Takeout.'
    }
    
    if (error.message.includes('IndexedDB') || error.message.includes('storage')) {
      return 'There was an issue saving your data locally. This might happen in private browsing mode or if storage is full. Please try clearing some browser data and try again.'
    }
    
    if (error.message.includes('parsing') || error.message.includes('parse')) {
      return 'We encountered an issue while processing your YouTube history file. The file may be in an unexpected format or corrupted.'
    }
    
    return 'An unexpected error occurred while importing your data. Please try again with a fresh download from Google Takeout.'
  }

  const getRecoverySteps = (error: Error) => {
    const steps = []
    
    if (error.message.includes('storage')) {
      steps.push('Try using regular browsing mode (not private/incognito)')
      steps.push('Clear browser storage and try again')
    } else {
      steps.push('Download a fresh copy of your data from Google Takeout')
      steps.push('Ensure you\'re uploading the watch-history.html file')
      steps.push('Check that the file isn\'t corrupted')
    }
    
    steps.push('Refresh the page and try again')
    
    return steps
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-red-500/10 rounded-full">
            <AlertCircle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-red-400">Import Failed</h2>
            <p className="text-red-300 text-sm">Something went wrong while processing your data</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-red-300 mb-3">{getErrorMessage(error)}</p>
            
            <details className="text-sm">
              <summary className="text-red-400 cursor-pointer hover:text-red-300 mb-2">
                Technical Details (for debugging)
              </summary>
              <pre className="text-red-200 bg-red-900/20 p-3 rounded text-xs overflow-auto">
                {error.name}: {error.message}
                {error.stack && `\n\nStack trace:\n${error.stack}`}
              </pre>
            </details>
          </div>

          <div>
            <h3 className="font-medium text-red-400 mb-2">Recovery Steps:</h3>
            <ul className="space-y-1 text-sm text-red-300">
              {getRecoverySteps(error).map((step, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="text-red-400 mt-1">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              onClick={resetError}
              className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Try Again</span>
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center space-x-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Upload className="h-4 w-4" />
              <span>Start Over</span>
            </button>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
          <h3 className="font-medium text-blue-400 mb-2">Need Help?</h3>
          <p className="text-blue-300 text-sm">
            If you continue to experience issues, make sure you&apos;re uploading the correct 
            <strong> watch-history.html</strong> file from your Google Takeout archive. 
            The file should contain your YouTube viewing history in HTML format.
          </p>
        </div>
      </div>
    </div>
  )
}

// Convenience wrapper for import components
export function withImportErrorBoundary<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WrappedComponent(props: P) {
    return (
      <ImportErrorBoundary>
        <Component {...props} />
      </ImportErrorBoundary>
    )
  }
}