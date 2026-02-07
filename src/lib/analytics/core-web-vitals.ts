// Core Web Vitals Tracking using web-vitals library
// Implements LCP, CLS, INP tracking with Sentry integration

import { onCLS, onFCP, onFID, onLCP, onINP, Metric } from 'web-vitals'
import * as Sentry from '@sentry/nextjs'

// Core Web Vitals target budgets
export const WEB_VITALS_BUDGETS = {
  LCP: 2500, // Largest Contentful Paint: < 2.5s (green)
  CLS: 0.1,  // Cumulative Layout Shift: < 0.1 (green)
  INP: 200,  // Interaction to Next Paint: < 200ms (green)
  FCP: 1800, // First Contentful Paint: < 1.8s (green)
  FID: 100,  // First Input Delay: < 100ms (green)
}

// Performance metrics interface
export interface CoreWebVitalsMetrics {
  LCP: number | null
  CLS: number | null
  INP: number | null
  FCP: number | null
  FID: number | null
  timestamp: Date
  url: string
}

// Global metrics storage for development dashboard
let currentMetrics: CoreWebVitalsMetrics = {
  LCP: null,
  CLS: null,
  INP: null,
  FCP: null,
  FID: null,
  timestamp: new Date(),
  url: '',
}

// Callback to update metrics
type MetricsCallback = (metrics: CoreWebVitalsMetrics) => void
let onMetricsUpdate: MetricsCallback | null = null

// Initialize web vitals tracking
export function initWebVitalsTracking(callback?: MetricsCallback) {
  if (onMetricsUpdate) onMetricsUpdate = callback

  // Track Largest Contentful Paint (LCP)
  onLCP((metric: Metric) => {
    const value = metric.value
    currentMetrics = { ...currentMetrics, LCP: value, timestamp: new Date() }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] LCP: ${value}ms (${value < WEB_VITALS_BUDGETS.LCP ? '✅' : '❌'})`)
    }
    
    // Send to Sentry Performance
    Sentry.capturePerformanceMeasurement({
      name: 'lcp',
      duration: value,
      startTime: metric.startTime,
      entry: metric.entries[0],
    })
    
    // Check budget and send to Sentry if failing
    if (value > WEB_VITALS_BUDGETS.LCP) {
      Sentry.captureMessage(`LCP exceeded budget: ${value}ms`, 'warning')
    }
    
    // Update callback
    if (onMetricsUpdate) {
      onMetricsUpdate(currentMetrics)
    }
  })

  // Track Cumulative Layout Shift (CLS)
  onCLS((metric: Metric) => {
    const value = metric.value
    currentMetrics = { ...currentMetrics, CLS: value, timestamp: new Date() }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] CLS: ${value} (${value < WEB_VITALS_BUDGETS.CLS ? '✅' : '❌'})`)
    }
    
    Sentry.capturePerformanceMeasurement({
      name: 'cls',
      duration: value,
      startTime: metric.startTime,
      entry: metric.entries[0],
    })
    
    if (value > WEB_VITALS_BUDGETS.CLS) {
      Sentry.captureMessage(`CLS exceeded budget: ${value}`, 'warning')
    }
    
    if (onMetricsUpdate) {
      onMetricsUpdate(currentMetrics)
    }
  })

  // Track Interaction to Next Paint (INP)
  onINP((metric: Metric) => {
    const value = metric.value
    currentMetrics = { ...currentMetrics, INP: value, timestamp: new Date() }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] INP: ${value}ms (${value < WEB_VITALS_BUDGETS.INP ? '✅' : '❌'})`)
    }
    
    Sentry.capturePerformanceMeasurement({
      name: 'inp',
      duration: value,
      startTime: metric.startTime,
      entry: metric.entries[0],
    })
    
    if (value > WEB_VITALS_BUDGETS.INP) {
      Sentry.captureMessage(`INP exceeded budget: ${value}ms`, 'warning')
    }
    
    if (onMetricsUpdate) {
      onMetricsUpdate(currentMetrics)
    }
  })

  // Track First Contentful Paint (FCP)
  onFCP((metric: Metric) => {
    const value = metric.value
    currentMetrics = { ...currentMetrics, FCP: value, timestamp: new Date() }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] FCP: ${value}ms (${value < WEB_VITALS_BUDGETS.FCP ? '✅' : '❌'})`)
    }
    
    Sentry.capturePerformanceMeasurement({
      name: 'fcp',
      duration: value,
      startTime: metric.startTime,
    })
    
    if (onMetricsUpdate) {
      onMetricsUpdate(currentMetrics)
    }
  })

  // Track First Input Delay (FID)
  onFID((metric: Metric) => {
    const value = metric.value
    currentMetrics = { ...currentMetrics, FID: value, timestamp: new Date() }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] FID: ${value}ms (${value < WEB_VITALS_BUDGETS.FID ? '✅' : '❌'})`)
    }
    
    Sentry.capturePerformanceMeasurement({
      name: 'fid',
      duration: value,
      startTime: metric.startTime,
    })
    
    if (onMetricsUpdate) {
      onMetricsUpdate(currentMetrics)
    }
  })
}

// Get current metrics (for development dashboard)
export function getCurrentMetrics(): CoreWebVitalsMetrics {
  return { ...currentMetrics }
}

// Check if metrics meet budgets
export function checkMetricsBudget(metrics: Partial<CoreWebVitalsMetrics>): {
  LCP: 'good' | 'needs-improvement' | 'poor'
  CLS: 'good' | 'needs-improvement' | 'poor'
  INP: 'good' | 'needs-improvement' | 'poor'
} {
  const getStatus = (value: number | null, budget: number): 'good' | 'needs-improvement' | 'poor' => {
    if (value === null) return 'needs-improvement'
    if (value <= budget) return 'good'
    if (value <= budget * 1.25) return 'needs-improvement'
    return 'poor'
  }

  return {
    LCP: getStatus(metrics.LCP, WEB_VITALS_BUDGETS.LCP),
    CLS: getStatus(metrics.CLS, WEB_VITALS_BUDGETS.CLS),
    INP: getStatus(metrics.INP, WEB_VITALS_BUDGETS.INP),
  }
}

// Get overall score (percentage of green metrics)
export function getOverallScore(): number {
  const metrics = getCurrentMetrics()
  const statuses = checkMetricsBudget(metrics)
  const score = [statuses.LCP, statuses.CLS, statuses.INP].filter(s => s === 'good').length
  return Math.round((score / 3) * 100)
}

// Subscribe to metrics updates
export function subscribeToMetrics(callback: MetricsCallback): () => void {
  onMetricsUpdate = callback
  // Immediately call with current metrics
  callback(currentMetrics)
  // Return unsubscribe function
  return () => {
    onMetricsUpdate = null
  }
}

// Report metrics to analytics (could be extended for external analytics)
export function reportMetricsToAnalytics(metrics: CoreWebVitalsMetrics) {
  // In production, this could send to external analytics service
  if (process.env.NODE_ENV === 'production') {
    // Send to custom analytics endpoint
    fetch('/api/analytics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metrics),
    }).catch(err => console.error('Failed to report web vitals:', err))
  }
}
