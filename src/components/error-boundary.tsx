'use client'

import { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from './button'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

// Error Boundary Props Interface
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  level?: 'page' | 'section' | 'component'
}

// Error Boundary State Interface
interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorId: string | null
}

// Global Error Boundary for entire application
export class GlobalErrorBoundary extends Component<ErrorBoundaryProps> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorId: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error,
      errorId: crypto.randomUUID(),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to Sentry with context
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        level: 'page',
      },
      tags: {
        error_boundary: 'page',
      },
    })

    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          level="page"
        />
      )
    }

    return this.props.children
  }
}

// Section-level Error Boundary
export class SectionErrorBoundary extends Component<ErrorBoundaryProps> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorId: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error,
      errorId: crypto.randomUUID(),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        level: 'section',
      },
      tags: {
        error_boundary: 'section',
      },
    })

    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          level="section"
        />
      )
    }

    return this.props.children
  }
}

// Component-level Error Boundary
export class ComponentErrorBoundary extends Component<ErrorBoundaryProps> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorId: null,
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { 
      hasError: true, 
      error,
      errorId: crypto.randomUUID(),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, {
      extra: {
        componentStack: errorInfo.componentStack,
        level: 'component',
      },
      tags: {
        error_boundary: 'component',
      },
    })

    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorId: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          level="component"
        />
      )
    }

    return this.props.children
  }
}

// Error Fallback Component
interface ErrorFallbackProps {
  error: Error | null
  errorId: string | null
  onRetry: () => void
  level: 'page' | 'section' | 'component'
}

function ErrorFallback({ error, errorId, onRetry, level }: ErrorFallbackProps) {
  const isPageLevel = level === 'page'
  const isSectionLevel = level === 'section'
  
  const containerClass = isPageLevel 
    ? 'min-h-[400px] flex flex-col items-center justify-center p-8 text-center'
    : isSectionLevel
    ? 'p-6 border rounded-lg bg-muted/50'
    : 'p-4 border rounded bg-muted/30'

  const titleClass = isPageLevel ? 'text-2xl font-semibold' : 'text-lg font-medium'
  const descriptionClass = isPageLevel ? 'text-muted-foreground mt-2' : 'text-sm text-muted-foreground mt-1'

  return (
    <div className={containerClass}>
      <div className="mb-4">
        <AlertCircle className={`${isPageLevel ? 'h-12 w-12' : 'h-8 w-8'} text-destructive mx-auto`} />
      </div>
      
      <h2 className={titleClass}>
        {isPageLevel ? 'Something went wrong' : 'Component error'}
      </h2>
      
      <p className={descriptionClass}>
        {isPageLevel 
          ? 'We encountered an unexpected error. Please try again or return to the dashboard.'
          : 'This component failed to load.'
        }
      </p>

      {error && process.env.NODE_ENV === 'development' && (
        <pre className="mt-4 p-4 bg-muted rounded-lg text-left text-xs max-w-lg overflow-auto">
          {error.message}
          {error.stack && `\n\n${error.stack}`}
        </pre>
      )}

      {errorId && (
        <p className="text-xs text-muted-foreground mt-2">
          Error ID: {errorId.slice(0, 8)}
        </p>
      )}

      <div className={`flex gap-3 mt-4 ${isPageLevel ? '' : 'mt-3'}`}>
        <Button onClick={onRetry} variant="default">
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
        
        {isPageLevel && (
          <Button 
            onClick={() => window.location.href = '/dashboard'} 
            variant="outline"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Dashboard
          </Button>
        )}
      </div>
    </div>
  )
}

// Re-export Button for convenience
import { Button } from './button'
