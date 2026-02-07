import { QueryClient } from '@tanstack/react-query'

// React Query configuration with optimized staleTimes for dashboard performance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time: 30 seconds for general queries
      staleTime: 30 * 1000, // 30 seconds
      // Longer stale time for specific queries that don't change often
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection time
      // Don't refetch on window focus for better UX during navigation
      refetchOnWindowFocus: false,
      // Retry failed requests once before showing error
      retry: 1,
      // Exponential backoff for retries (1s, 2s, 4s...)
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    },
    mutations: {
      // Retry mutations once on failure
      retry: 1,
    },
  },
})

// Dashboard-specific query configurations
export const dashboardQueryOptions = {
  // Metrics queries - refresh every minute
  metrics: {
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  },
  // Customer data - refresh every 2 minutes
  customers: {
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 2 * 60 * 1000, // Auto-refresh every 2 minutes
  },
  // Revenue data - refresh every 5 minutes
  revenue: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  },
  // AI queries - cache for 10 minutes (expensive operations)
  ai: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
  },
  // Alerts - refresh every 30 seconds (real-time nature)
  alerts: {
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  },
}

// Query key factory for consistent key management
export const queryKeys = {
  dashboard: {
    all: ['dashboard'] as const,
    metrics: ['dashboard', 'metrics'] as const,
    customers: ['dashboard', 'customers'] as const,
    revenue: ['dashboard', 'revenue'] as const,
    alerts: ['dashboard', 'alerts'] as const,
  },
  ai: {
    all: ['ai'] as const,
    query: (queryId: string) => ['ai', 'query', queryId] as const,
    history: ['ai', 'history'] as const,
  },
  organizations: {
    all: ['organizations'] as const,
    current: ['organizations', 'current'] as const,
    members: ['organizations', 'members'] as const,
  },
} as const
