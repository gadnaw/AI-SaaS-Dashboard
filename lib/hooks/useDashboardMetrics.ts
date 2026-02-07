'use client'

import { useQuery } from '@tanstack/react-query'

export interface DashboardMetrics {
  totalRevenue: number
  totalRevenueTrend: number
  totalCustomers: number
  totalCustomersTrend: number
  activeSubscriptions: number
  activeSubscriptionsTrend: number
  churnRate: number
  churnRateTrend: number
  revenueByMonth: {
    date: string
    revenue: number
    previousPeriod?: number
  }[]
  revenueSparkline: { value: number }[]
  customersSparkline: { value: number }[]
  subscriptionsSparkline: { value: number }[]
}

interface UseDashboardMetricsOptions {
  enabled?: boolean
  refetchInterval?: number
}

async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  const response = await fetch('/api/dashboard/metrics')

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to fetch metrics' }))
    throw new Error(error.message || 'Failed to fetch dashboard metrics')
  }

  return response.json()
}

export function useDashboardMetrics({
  enabled = true,
  refetchInterval,
}: UseDashboardMetricsOptions = {}) {
  return useQuery({
    queryKey: ['dashboard', 'metrics'],
    queryFn: fetchDashboardMetrics,
    enabled,
    refetchInterval,
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes (formerly cacheTime)
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })
}

// Hook for individual metrics with shorter refresh intervals
export function useRevenueMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics', 'revenue'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/metrics?type=revenue')
      if (!response.ok) {
        throw new Error('Failed to fetch revenue metrics')
      }
      return response.json()
    },
    staleTime: 30000, // 30 seconds
    gcTime: 120000, // 2 minutes
    refetchInterval: 60000, // 1 minute
  })
}

export function useCustomerMetrics() {
  return useQuery({
    queryKey: ['dashboard', 'metrics', 'customers'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/metrics?type=customers')
      if (!response.ok) {
        throw new Error('Failed to fetch customer metrics')
      }
      return response.json()
    },
    staleTime: 60000, // 1 minute
    gcTime: 300000, // 5 minutes
    refetchInterval: 120000, // 2 minutes
  })
}
