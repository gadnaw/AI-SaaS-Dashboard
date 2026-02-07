'use client'

import { Skeleton } from '@/components/ui/skeleton'

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-[200px]" />
        <Skeleton className="h-4 w-[300px]" />
      </div>

      {/* KPI Grid Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
            <Skeleton className="h-4 w-[100px] mb-3" />
            <Skeleton className="h-8 w-[120px] mb-2" />
            <Skeleton className="h-3 w-[80px]" />
          </div>
        ))}
      </div>

      {/* Charts Grid Skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
            <Skeleton className="h-5 w-[150px] mb-4" />
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="p-6 border-b">
          <Skeleton className="h-5 w-[150px]" />
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Card-based Skeleton for individual components
export function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <Skeleton className="h-5 w-[120px] mb-4" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
    </div>
  )
}

// Table Row Skeleton
export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 py-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-[180px]" />
        <Skeleton className="h-3 w-[120px]" />
      </div>
      <Skeleton className="h-6 w-[80px] rounded-full" />
    </div>
  )
}

// Chart Skeleton
export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="w-full rounded-lg bg-muted/50" style={{ height }}>
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading chart...</span>
        </div>
      </div>
    </div>
  )
}
