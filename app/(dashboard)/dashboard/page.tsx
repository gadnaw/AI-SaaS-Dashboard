'use client'

import { Suspense } from 'react'
import { useDashboardMetrics } from '@/lib/hooks/useDashboardMetrics'
import { KPIGrid } from '@/components/dashboard/KPIGrid'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle } from 'lucide-react'

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-6 shadow-sm">
            <Skeleton className="h-4 w-[100px]" />
            <Skeleton className="mt-4 h-8 w-[120px]" />
            <Skeleton className="mt-2 h-3 w-[80px]" />
          </div>
        ))}
      </div>
      <Skeleton className="h-[300px] w-full rounded-xl" />
    </div>
  )
}

function DashboardError({ error }: { error: Error }) {
  return (
    <div className="flex h-[400px] w-full items-center justify-center rounded-xl border bg-card">
      <div className="flex flex-col items-center gap-2 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-lg font-medium">Failed to load dashboard</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
      </div>
    </div>
  )
}

function DashboardContent() {
  const {
    data: metrics,
    isLoading,
    error,
  } = useDashboardMetrics({
    refetchInterval: 60000, // Refresh every minute
  })

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return <DashboardError error={error as Error} />
  }

  if (!metrics) {
    return null
  }

  const kpiMetrics = [
    {
      title: 'Total Revenue',
      value: metrics.totalRevenue,
      format: 'currency' as const,
      trend: metrics.totalRevenueTrend,
      trendLabel: 'vs last month',
      sparklineData: metrics.revenueSparkline,
    },
    {
      title: 'Total Customers',
      value: metrics.totalCustomers,
      format: 'number' as const,
      trend: metrics.totalCustomersTrend,
      trendLabel: 'vs last month',
      sparklineData: metrics.customersSparkline,
    },
    {
      title: 'Active Subscriptions',
      value: metrics.activeSubscriptions,
      format: 'number' as const,
      trend: metrics.activeSubscriptionsTrend,
      trendLabel: 'vs last month',
      sparklineData: metrics.subscriptionsSparkline,
    },
    {
      title: 'Churn Rate',
      value: metrics.churnRate,
      format: 'percent' as const,
      trend: metrics.churnRateTrend,
      trendLabel: 'vs last month',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back! Here&apos;s an overview of your business metrics.
          </p>
        </div>
      </div>

      <KPIGrid metrics={kpiMetrics} columns={4} />

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartContainer
          title="Revenue Overview"
          description="Monthly revenue trends"
          loading={isLoading}
          error={error ? error.message : null}
          empty={!metrics.revenueByMonth?.length}
          emptyMessage="No revenue data available"
        >
          <RevenueChart
            data={metrics.revenueByMonth || []}
            showPreviousPeriod={true}
            height={300}
          />
        </ChartContainer>

        <ChartContainer
          title="Customer Growth"
          description="Customer acquisition trends"
          loading={isLoading}
          error={error ? error.message : null}
          empty={!metrics.revenueByMonth?.length}
          emptyMessage="No customer data available"
        >
          <RevenueChart
            data={(metrics.revenueByMonth || []).map((d) => ({
              date: d.date,
              revenue: Math.floor(d.revenue * 0.3), // Simulated customer value
              previousPeriod: d.previousPeriod
                ? Math.floor(d.previousPeriod * 0.25)
                : undefined,
            }))}
            height={300}
          />
        </ChartContainer>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
