'use client'

import { useCallback } from 'react'
import { Button } from './button'
import { RefreshCw, AlertCircle, Wifi, WifiOff, Clock } from 'lucide-react'
import * as Sentry from '@sentry/nextjs'

// Error types for friendly messages
export type ErrorType = 
  | 'network' 
  | 'timeout' 
  | 'auth' 
  | 'validation' 
  | 'server' 
  | 'unknown'

// Retry Button Props
interface RetryButtonProps {
  onRetry: () => void
  error?: Error | null
  errorType?: ErrorType
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  children?: React.ReactNode
}

// Get friendly error message based on error type
function getErrorMessage(errorType: ErrorType, originalMessage?: string): {
  title: string
  description: string
  suggestion: string
  icon: React.ReactNode
} {
  switch (errorType) {
    case 'network':
      return {
        title: 'Connection failed',
        description: originalMessage || 'Unable to connect to the server.',
        suggestion: 'Check your internet connection and try again.',
        icon: <WifiOff className="h-5 w-5" />,
      }
    case 'timeout':
      return {
        title: 'Request timed out',
        description: 'The server took too long to respond.',
        suggestion: 'Try again - the server may be busy.',
        icon: <Clock className="h-5 w-5" />,
      }
    case 'auth':
      return {
        title: 'Authentication required',
        description: originalMessage || 'You need to log in to continue.',
        suggestion: 'Please log in or refresh your session.',
        icon: <AlertCircle className="h-5 w-5" />,
      }
    case 'validation':
      return {
        title: 'Invalid data',
        description: originalMessage || 'The data you provided is invalid.',
        suggestion: 'Check your input and try again.',
        icon: <AlertCircle className="h-5 w-5" />,
      }
    case 'server':
      return {
        title: 'Server error',
        description: originalMessage || 'Something went wrong on our end.',
        suggestion: 'Our team has been notified. Please try again later.',
        icon: <AlertCircle className="h-5 w-5" />,
      }
    default:
      return {
        title: 'Something went wrong',
        description: originalMessage || 'An unexpected error occurred.',
        suggestion: 'Try again or contact support if the problem persists.',
        icon: <AlertCircle className="h-5 w-5" />,
      }
  }
}

// Detect error type from error object
function detectErrorType(error: Error): ErrorType {
  const message = error.message.toLowerCase()
  
  if (message.includes('network') || message.includes('fetch') || message.includes('offline')) {
    return 'network'
  }
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout'
  }
  if (message.includes('unauthorized') || message.includes('auth') || message.includes('401') || message.includes('403')) {
    return 'auth'
  }
  if (message.includes('validation') || message.includes('invalid') || message.includes('400')) {
    return 'validation'
  }
  if (message.includes('500') || message.includes('server') || message.includes('internal')) {
    return 'server'
  }
  
  return 'unknown'
}

// Retry Button Component
export function RetryButton({
  onRetry,
  error,
  errorType,
  variant = 'default',
  size = 'default',
  className = '',
  children,
}: RetryButtonProps) {
  const detectedType = error ? detectErrorType(error) : (errorType || 'unknown')
  const errorInfo = getErrorMessage(detectedType, error?.message)

  const handleRetry = useCallback(() => {
    // Log retry attempt to Sentry
    if (error) {
      Sentry.captureMessage('User retrying after error', {
        level: 'info',
        extra: {
          errorType: detectedType,
          originalError: error.message,
        },
      })
    }
    
    onRetry()
  }, [error, detectedType, onRetry])

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Error Info */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {errorInfo.icon}
        <div className="text-center">
          <p className="font-medium text-foreground">{errorInfo.title}</p>
          <p className="text-xs">{errorInfo.suggestion}</p>
        </div>
      </div>

      {/* Retry Button */}
      <Button onClick={handleRetry} variant={variant} size={size}>
        <RefreshCw className="mr-2 h-4 w-4" />
        {children || 'Try Again'}
      </Button>
    </div>
  )
}

// Error Display with Toast Notification
interface ErrorDisplayProps {
  error: Error
  onRetry?: () => void
  onDismiss?: () => void
  showToast?: boolean
}

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss,
  showToast = true 
}: ErrorDisplayProps) {
  const errorType = detectErrorType(error)
  const errorInfo = getErrorMessage(errorType, error.message)

  // Log to Sentry
  Sentry.captureException(error, {
    extra: {
      errorType,
      userAction: onRetry ? 'retry' : 'dismiss',
    },
  })

  return (
    <div className="flex flex-col items-center gap-3 p-4 border rounded-lg bg-destructive/5">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <span className="font-medium">{errorInfo.title}</span>
      </div>
      
      <p className="text-sm text-muted-foreground text-center">
        {errorInfo.description}
      </p>

      <div className="flex gap-2">
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="mr-1 h-3 w-3" />
            Retry
          </Button>
        )}
        
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            Dismiss
          </Button>
        )}
      </div>

      {process.env.NODE_ENV === 'development' && (
        <pre className="mt-2 p-2 bg-muted rounded text-xs max-w-md overflow-auto">
          {error.message}
        </pre>
      )}
    </div>
  )
}

// Query Error Handler with automatic retry logic
interface UseQueryRetryOptions {
  maxRetries?: number
  retryDelay?: number
  onError?: (error: Error, retryCount: number) => void
}

export function useQueryRetry<T>(
  queryFn: () => Promise<T>,
  options: UseQueryRetryOptions = {}
) {
  const { maxRetries = 3, retryDelay = 1000, onError } = options
  
  const [error, setError] = useState<Error | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const execute = useCallback(async () => {
    setError(null)
    setRetryCount(0)
    
    let lastError: Error
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        setRetryCount(attempt)
        return await queryFn()
      } catch (err) {
        lastError = err as Error
        
        if (attempt < maxRetries) {
          // Log retry attempt
          Sentry.captureMessage('Query retry attempt', {
            level: 'warning',
            extra: {
              attempt: attempt + 1,
              maxRetries,
              errorType: detectErrorType(lastError),
            },
          })
          
          // Wait before retrying with exponential backoff
          await new Promise(resolve => 
            setTimeout(resolve, retryDelay * Math.pow(2, attempt))
          )
        }
      }
    }
    
    // All retries failed
    setError(lastError)
    onError?.(lastError, maxRetries)
    
    throw lastError
  }, [queryFn, maxRetries, retryDelay, onError])

  return {
    execute,
    error,
    retryCount,
    isRetrying: retryCount > 0,
    hasError: error !== null,
  }
}

import { useState } from 'react'
