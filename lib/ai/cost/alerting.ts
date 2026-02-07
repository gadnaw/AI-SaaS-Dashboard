import { usageTracker } from './tracker'
import { DEFAULT_LIMITS } from './limits'

export interface AlertConfig {
  warningThreshold: number
  criticalThreshold: number
  email?: string
}

export type AlertType = 'warning' | 'critical' | 'budget_exceeded' | null

export interface Alert {
  id?: string
  orgId: string
  type: AlertType
  period: string
  usage: number
  limit: number
  percentage: number
  created_at?: Date
}

export interface UsageDashboard {
  orgId: string
  currentPeriod: string
  used: number
  limit: number
  percentage: number
  alerts: AlertType[]
  trend: 'increasing' | 'decreasing' | 'stable'
  projectedUsage: number
  daysRemaining: number
}

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  warningThreshold: 80,
  criticalThreshold: 95,
}

const ALERT_MESSAGES: Record<AlertType, string> = {
  warning: 'You have used 80% of your monthly AI token limit. Consider reviewing usage or upgrading your plan.',
  critical: 'You have used 95% of your monthly AI token limit. Immediate action required to avoid service interruption.',
  budget_exceeded: 'You have exceeded your monthly AI token limit. Some features may be restricted until the next billing cycle.',
}

export async function checkAlert(
  orgId: string,
  period: 'daily' | 'weekly' | 'monthly' = 'monthly'
): Promise<AlertType> {
  const usage = await usageTracker.getUsage(orgId, period)
  const limit = DEFAULT_LIMITS[period] || DEFAULT_LIMITS.monthly!
  
  const percentage = (usage.totalTokens / limit) * 100
  
  if (percentage >= 100) {
    return 'budget_exceeded'
  }
  
  if (percentage >= DEFAULT_ALERT_CONFIG.criticalThreshold) {
    return 'critical'
  }
  
  if (percentage >= DEFAULT_ALERT_CONFIG.warningThreshold) {
    return 'warning'
  }
  
  return null
}

export async function checkAllPeriodsForAlerts(orgId: string): Promise<{
  daily: AlertType
  weekly: AlertType
  monthly: AlertType
}> {
  const [daily, weekly, monthly] = await Promise.all([
    checkAlert(orgId, 'daily'),
    checkAlert(orgId, 'weekly'),
    checkAlert(orgId, 'monthly'),
  ])
  
  return { daily, weekly, monthly }
}

export async function triggerAlert(
  orgId: string,
  alertType: AlertType,
  period: 'daily' | 'weekly' | 'monthly' = 'monthly'
): Promise<Alert> {
  if (alertType === null) {
    throw new Error('Cannot trigger null alert')
  }
  
  const usage = await usageTracker.getUsage(orgId, period)
  const limit = DEFAULT_LIMITS[period] || DEFAULT_LIMITS.monthly!
  
  const alert: Alert = {
    orgId,
    type: alertType,
    period,
    usage: usage.totalTokens,
    limit,
    percentage: (usage.totalTokens / limit) * 100,
  }
  
  console.log(`[AI Alert] ${alertType.toUpperCase()} for org ${orgId}: ${usage.totalTokens}/${limit} tokens (${alert.percentage.toFixed(1)}%)`)
  
  if (alertType === 'critical' || alertType === 'budget_exceeded') {
    await sendAlertNotification(orgId, alert)
  }
  
  return alert
}

async function sendAlertNotification(orgId: string, alert: Alert): Promise<void> {
  try {
    const { createServerClient } = await import('@supabase/ssr')
    const { cookies } = await import('next/headers')
    
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
        },
      }
    )
    
    const { data: orgAdmins } = await supabase
      .from('profiles')
      .select('email')
      .eq('organization_id', orgId)
      .eq('role', 'admin')
    
    if (orgAdmins && orgAdmins.length > 0) {
      for (const admin of orgAdmins) {
        if (admin.email) {
          console.log(`[AI Alert] Would send email to ${admin.email}: ${ALERT_MESSAGES[alert.type!]}`)
        }
      }
    }
  } catch (error) {
    console.error('[AI Alert] Failed to send notification:', error)
  }
}

export async function getUsageDashboard(orgId: string): Promise<UsageDashboard> {
  const [dailyUsage, weeklyUsage, monthlyUsage, history] = await Promise.all([
    usageTracker.getUsage(orgId, 'daily'),
    usageTracker.getUsage(orgId, 'weekly'),
    usageTracker.getUsage(orgId, 'monthly'),
    usageTracker.getUsageHistory(
      orgId,
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date()
    ),
  ])
  
  const monthlyLimit = DEFAULT_LIMITS.monthly || 200000
  const alerts = Object.values(await checkAllPeriodsForAlerts(orgId)).filter(a => a !== null) as AlertType[]
  
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable'
  if (history.length >= 2) {
    const recentUsage = history.slice(-7).reduce((sum, h) => sum + h.totalTokens, 0)
    const olderUsage = history.slice(-14, -7).reduce((sum, h) => sum + h.totalTokens, 0)
    
    if (olderUsage > 0) {
      const changePercent = ((recentUsage - olderUsage) / olderUsage) * 100
      if (changePercent > 10) {
        trend = 'increasing'
      } else if (changePercent < -10) {
        trend = 'decreasing'
      }
    }
  }
  
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysRemaining = Math.max(0, daysInMonth - now.getDate())
  
  const dailyAverage = history.length > 0
    ? history.reduce((sum, h) => sum + h.totalTokens, 0) / history.length
    : 0
  
  const projectedUsage = Math.ceil(dailyAverage * daysRemaining) + monthlyUsage.totalTokens
  
  return {
    orgId,
    currentPeriod: 'monthly',
    used: monthlyUsage.totalTokens,
    limit: monthlyLimit,
    percentage: Math.round((monthlyUsage.totalTokens / monthlyLimit) * 100),
    alerts,
    trend,
    projectedUsage,
    daysRemaining,
  }
}

export async function getAlertHistory(
  orgId: string,
  limit: number = 30
): Promise<Alert[]> {
  const { db } = await import('@/lib/db')
  
  const alerts = await db
    .selectFrom('ai_usage')
    .select([
      'period_start',
      sql<number>`SUM(prompt_tokens + completion_tokens)`.as('total_usage'),
    ])
    .where('org_id', '=', orgId)
    .groupBy('period_start')
    .orderBy('period_start', 'desc')
    .limit(limit)
    .execute()
  
  const monthlyLimit = DEFAULT_LIMITS.monthly || 200000
  
  return alerts.map(a => {
    const percentage = (Number(a.total_usage) / monthlyLimit) * 100
    let type: AlertType = null
    
    if (percentage >= 100) {
      type = 'budget_exceeded'
    } else if (percentage >= 95) {
      type = 'critical'
    } else if (percentage >= 80) {
      type = 'warning'
    }
    
    return {
      orgId,
      type,
      period: 'monthly',
      usage: Number(a.total_usage),
      limit: monthlyLimit,
      percentage,
    }
  })
}

export function formatAlertForDisplay(alert: Alert): string {
  const messages = {
    warning: `⚠️ Warning: You've used ${alert.percentage.toFixed(0)}% of your ${alert.period} limit`,
    critical: `🚨 Critical: You've used ${alert.percentage.toFixed(0)}% of your ${alert.period} limit`,
    budget_exceeded: `⛔ Limit Exceeded: You've exceeded your ${alert.period} AI limit`,
  }
  
  return messages[alert.type!] || ''
}

export async function dismissAlert(
  orgId: string,
  alertType: AlertType
): Promise<boolean> {
  console.log(`[AI Alert] Alert dismissed for org ${orgId}: ${alertType}`)
  return true
}

export async function snoozeAlert(
  orgId: string,
  alertType: AlertType,
  hours: number = 24
): Promise<boolean> {
  const snoozeUntil = new Date(Date.now() + hours * 60 * 60 * 1000)
  console.log(`[AI Alert] Alert snoozed for org ${orgId} until ${snoozeUntil.toISOString()}`)
  return true
}

function sql<T>(strings: TemplateStringsArray): any {
  return {} as T
}
