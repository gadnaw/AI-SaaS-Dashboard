export interface AppError {
  code: string
  message: string
  context?: Record<string, unknown>
  retryable: boolean
}

export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  DATABASE_ERROR: 'DATABASE_ERROR',
  AI_ERROR: 'AI_ERROR',
  MFA_ERROR: 'MFA_ERROR',
  ORG_CONTEXT_ERROR: 'ORG_CONTEXT_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES]

/**
 * Create a standardized error object
 */
export function createError(
  code: ErrorCode,
  message: string,
  options?: {
    context?: Record<string, unknown>
    retryable?: boolean
  }
): AppError {
  return {
    code,
    message,
    context: options?.context,
    retryable: options?.retryable ?? false,
  }
}

/**
 * Wrap a function to catch and standardize errors
 */
export function withErrorHandling<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>,
  errorHandler?: (error: unknown) => AppError
): (...args: Args) => Promise<T> {
  return async (...args: Args) => {
    try {
      return await fn(...args)
    } catch (error) {
      if (errorHandler) {
        throw errorHandler(error)
      }
      throw createError(
        ERROR_CODES.UNKNOWN,
        error instanceof Error ? error.message : 'An unknown error occurred'
      )
    }
  }
}

/**
 * Create an unauthorized error
 */
export function unauthorizedError(message: string = 'Unauthorized') {
  return createError(ERROR_CODES.UNAUTHORIZED, message)
}

/**
 * Create a not found error
 */
export function notFoundError(message: string = 'Resource not found') {
  return createError(ERROR_CODES.NOT_FOUND, message)
}

/**
 * Create a validation error
 */
export function validationError(
  message: string,
  context?: Record<string, unknown>
) {
  return createError(ERROR_CODES.VALIDATION_ERROR, message, { context })
}

/**
 * Create a database error
 */
export function databaseError(message: string, context?: Record<string, unknown>) {
  return createError(ERROR_CODES.DATABASE_ERROR, message, {
    context,
    retryable: true,
  })
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: AppError): boolean {
  return error.retryable
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: AppError): string {
  switch (error.code) {
    case ERROR_CODES.UNAUTHORIZED:
      return 'Please sign in to continue'
    case ERROR_CODES.NOT_FOUND:
      return 'The requested resource was not found'
    case ERROR_CODES.VALIDATION_ERROR:
      return error.message
    case ERROR_CODES.RATE_LIMITED:
      return 'Too many requests. Please try again later'
    case ERROR_CODES.QUOTA_EXCEEDED:
      return 'You have exceeded your usage limit'
    case ERROR_CODES.DATABASE_ERROR:
      return 'A database error occurred. Please try again'
    case ERROR_CODES.AI_ERROR:
      return 'AI service error. Please try again'
    case ERROR_CODES.MFA_ERROR:
      return 'Two-factor authentication error. Please try again'
    case ERROR_CODES.ORG_CONTEXT_ERROR:
      return 'Organization context error. Please sign in again'
    default:
      return error.message
  }
}
