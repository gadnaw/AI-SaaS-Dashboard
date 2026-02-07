'use client'

import { QueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 60 * 1000, // 1 minute (60 seconds)
        gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
        refetchOnWindowFocus: false,
        retry: 1,
        refetchInterval: 60000, // Auto-refetch every 60 seconds
      },
      mutations: {
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient()
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) browserQueryClient = makeQueryClient()
    return browserQueryClient
  }
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Re-export QueryClientProvider for convenience
import { QueryClientProvider } from '@tanstack/react-query'
