'use client'

import { useEffect, useState } from 'react'
import {
  getCurrentMetrics,
  getOverallScore,
  checkMetricsBudget,
  WEB_VITALS_BUDGETS,
  type CoreWebVitalsMetrics,
  subscribeToMetrics,
} from '@/lib/analytics/core-web-vitals'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

export function WebVitalsDashboard() {
  const [metrics, setMetrics] = useState<CoreWebVitalsMetrics>(getCurrentMetrics())
  const [score, setScore] = useState(getOverallScore())

  useEffect(() => {
    // Subscribe to metrics updates
    const unsubscribe = subscribeToMetrics((newMetrics) => {
      setMetrics(newMetrics)
      setScore(getOverallScore())
    })

    return unsubscribe
  }, [])

  const statuses = checkMetricsBudget(metrics)

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getStatusIcon = (status: 'good' | 'needs-improvement' | 'poor') => {
    switch (status) {
      case 'good':
        return '✅'
      case 'needs-improvement':
        return '⚠️'
      case 'poor':
        return '❌'
    }
  }

  return (
    <div className="space-y-4 p-4 bg-card rounded-xl border">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Core Web Vitals</h3>
        <div className={`text-2xl font-bold ${getScoreColor(score)}`}>
          {score}%
        </div>
      </div>

      {/* Score Progress Bar */}
      <Progress value={score} className="h-2" />

      {/* Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* LCP */}
        <MetricCard
          name="LCP"
          value={metrics.LCP}
          budget={WEB_VITALS_BUDGETS.LCP}
          unit="ms"
          status={statuses.LCP}
          icon={getStatusIcon(statuses.LCP)}
          description="Largest Contentful Paint"
        />

        {/* CLS */}
        <MetricCard
          name="CLS"
          value={metrics.CLS}
          budget={WEB_VITALS_BUDGETS.CLS}
          unit=""
          status={statuses.CLS}
          icon={getStatusIcon(statuses.CLS)}
          description="Cumulative Layout Shift"
        />

        {/* INP */}
        <MetricCard
          name="INP"
          value={metrics.INP}
          budget={WEB_VITALS_BUDGETS.INP}
          unit="ms"
          status={statuses.INP}
          icon={getStatusIcon(statuses.INP)}
          description="Interaction to Next Paint"
        />
      </div>

      {/* Budget Reference */}
      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p>Targets: LCP &lt; {WEB_VITALS_BUDGETS.LCP}ms | CLS &lt; {WEB_VITALS_BUDGETS.CLS} | INP &lt; {WEB_VITALS_BUDGETS.INP}ms</p>
        <p>Last updated: {metrics.timestamp.toLocaleTimeString()}</p>
      </div>
    </div>
  )
}

// Individual Metric Card Component
function MetricCard({
  name,
  value,
  budget,
  unit,
  status,
  icon,
  description,
}: {
  name: string
  value: number | null
  budget: number
  unit: string
  status: 'good' | 'needs-improvement' | 'poor'
  icon: string
  description: string
}) {
  const getStatusColor = (status: 'good' | 'needs-improvement' | 'poor') => {
    switch (status) {
      case 'good':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950'
      case 'needs-improvement':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950'
      case 'poor':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950'
    }
  }

  const displayValue = value !== null 
    ? `${value.toFixed(value < 1 ? 3 : 0)}${unit}` 
    : 'Measuring...'

  const budgetText = `${budget}${unit}`

  return (
    <div className={`rounded-lg border p-3 ${getStatusColor(status)}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className="text-2xl font-bold mb-1">
        {displayValue}
      </div>
      <div className="text-xs text-muted-foreground mb-2">
        Target: {budgetText}
      </div>
      <div className="text-xs capitalize">
        {status.replace('-', ' ')}
      </div>
    </div>
  )
}
