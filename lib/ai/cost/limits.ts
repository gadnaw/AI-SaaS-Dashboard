import { usageTracker } from './tracker'

export interface LimitConfig {
  daily?: number
  weekly?: number
  monthly?: number
  perQuery?: number
}

export interface LimitCheckResult {
  allowed: boolean
  reason?: string
  currentUsage: number
  limit: number
  remaining: number
}

export const DEFAULT_LIMITS: LimitConfig = {
  daily: 10000,
  weekly: 50000,
  monthly: 200000,
  perQuery: 7500,
}

const TIER_CONFIGS: Record<string, LimitConfig> = {
  free: {
    daily: 5000,
    weekly: 25000,
    monthly: 100000,
    perQuery: 5000,
  },
  pro: {
    daily: 25000,
    weekly: 150000,
    monthly: 600000,
    perQuery: 10000,
  },
  enterprise: {
    daily: 100000,
    weekly: 700000,
    monthly: 2800000,
    perQuery: 15000,
  },
}

export function getLimitConfig(tier: string = 'free'): LimitConfig {
  return TIER_CONFIGS[tier] || DEFAULT_LIMITS
}

export async function checkLimit(
  orgId: string,
  estimatedTokens: number,
  period: 'daily' | 'weekly' | 'monthly' = 'monthly'
): Promise<LimitCheckResult> {
  const config = DEFAULT_LIMITS
  
  const usage = await usageTracker.getUsage(orgId, period)
  const currentUsage = usage.totalTokens
  const limit = config[period] || config.monthly!
  const remaining = Math.max(0, limit - currentUsage)
  
  if (currentUsage >= limit) {
    return {
      allowed: false,
      reason: `${period} token limit reached. Used ${currentUsage.toLocaleString()} of ${limit.toLocaleString()} tokens.`,
      currentUsage,
      limit,
      remaining: 0,
    }
  }
  
  if (currentUsage + estimatedTokens > limit) {
    return {
      allowed: false,
      reason: `This query would exceed the ${period} limit. ${remaining.toLocaleString()} tokens remaining.`,
      currentUsage,
      limit,
      remaining,
    }
  }
  
  if (estimatedTokens > (config.perQuery || DEFAULT_LIMITS.perQuery!)) {
    return {
      allowed: false,
      reason: `Query too large (${estimatedTokens} tokens). Maximum per query is ${config.perQuery || DEFAULT_LIMITS.perQuery} tokens.`,
      currentUsage,
      limit,
      remaining,
    }
  }
  
  return {
    allowed: true,
    currentUsage,
    limit,
    remaining,
  }
}

export async function checkAllLimits(
  orgId: string,
  estimatedTokens: number
): Promise<{
  daily: LimitCheckResult
  weekly: LimitCheckResult
  monthly: LimitCheckResult
  perQuery: LimitCheckResult
}> {
  const [daily, weekly, monthly] = await Promise.all([
    checkLimit(orgId, estimatedTokens, 'daily'),
    checkLimit(orgId, estimatedTokens, 'weekly'),
    checkLimit(orgId, estimatedTokens, 'monthly'),
  ])

  const perQueryLimit = DEFAULT_LIMITS.perQuery || 7500
  
  const perQuery: LimitCheckResult = {
    allowed: estimatedTokens <= perQueryLimit,
    currentUsage: estimatedTokens,
    limit: perQueryLimit,
    remaining: Math.max(0, perQueryLimit - estimatedTokens),
    reason: estimatedTokens > perQueryLimit
      ? `Query exceeds per-query limit of ${perQueryLimit} tokens`
      : undefined,
  }

  return { daily, weekly, monthly, perQuery }
}

export async function getRemainingLimits(
  orgId: string
): Promise<{
  daily: { used: number; limit: number; percentage: number }
  weekly: { used: number; limit: number; percentage: number }
  monthly: { used: number; limit: number; percentage: number }
}> {
  const [dailyUsage, weeklyUsage, monthlyUsage] = await Promise.all([
    usageTracker.getUsage(orgId, 'daily'),
    usageTracker.getUsage(orgId, 'weekly'),
    usageTracker.getUsage(orgId, 'monthly'),
  ])

  const dailyLimit = DEFAULT_LIMITS.daily || 10000
  const weeklyLimit = DEFAULT_LIMITS.weekly || 50000
  const monthlyLimit = DEFAULT_LIMITS.monthly || 200000

  return {
    daily: {
      used: dailyUsage.totalTokens,
      limit: dailyLimit,
      percentage: Math.round((dailyUsage.totalTokens / dailyLimit) * 100),
    },
    weekly: {
      used: weeklyUsage.totalTokens,
      limit: weeklyLimit,
      percentage: Math.round((weeklyUsage.totalTokens / weeklyLimit) * 100),
    },
    monthly: {
      used: monthlyUsage.totalTokens,
      limit: monthlyLimit,
      percentage: Math.round((monthlyUsage.totalTokens / monthlyLimit) * 100),
    },
  }
}

export function getOptimalModel(query: string): 'gpt-4o' | 'gpt-4o-mini' {
  const lowerQuery = query.toLowerCase()
  
  const simplePatterns = [
    'count',
    'how many',
    'total',
    'sum of',
    'average',
    'show me',
    'list all',
    'simple',
  ]
  
  const complexPatterns = [
    'trend',
    'comparison',
    'analyze',
    'predict',
    'forecast',
    'insight',
    'why',
    'correlation',
    'pattern',
    'recommend',
    'suggest',
  ]
  
  const complexCount = complexPatterns.filter(p => lowerQuery.includes(p)).length
  const simpleCount = simplePatterns.filter(p => lowerQuery.includes(p)).length
  
  if (complexCount > simpleCount || lowerQuery.length > 500) {
    return 'gpt-4o'
  }
  
  if (simpleCount > complexCount && lowerQuery.length < 200) {
    return 'gpt-4o-mini'
  }
  
  return lowerQuery.length > 300 ? 'gpt-4o' : 'gpt-4o-mini'
}

export function estimateQueryTokens(query: string): number {
  return Math.ceil(query.length / 4) + 500
}

export function calculateQueryCost(
  promptTokens: number,
  completionTokens: number,
  model: 'gpt-4o' | 'gpt-4o-mini' = 'gpt-4o'
): number {
  const pricing = model === 'gpt-4o-mini'
    ? { prompt: 0.00015, completion: 0.0006 }
    : { prompt: 0.005, completion: 0.015 }
  
  return (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1000
}

export async function checkTierUpgrade(
  orgId: string
): Promise<{
  shouldUpgrade: boolean
  currentTier: string
  suggestedTier: string
  reason: string
}> {
  const usage = await usageTracker.getUsage(orgId, 'monthly')
  const monthlyLimit = DEFAULT_LIMITS.monthly || 200000
  
  const usagePercentage = (usage.totalTokens / monthlyLimit) * 100
  
  let currentTier = 'free'
  let suggestedTier = 'free'
  let reason = ''
  
  if (usagePercentage > 150) {
    suggestedTier = 'pro'
    currentTier = 'free'
    reason = 'Your usage has exceeded 150% of the free tier limit. Consider upgrading to Pro.'
  } else if (usagePercentage > 100) {
    suggestedTier = 'pro'
    currentTier = 'free'
    reason = 'You\'ve reached the free tier limit. Upgrade to Pro for higher limits.'
  } else if (usagePercentage > 80) {
    suggestedTier = 'pro'
    currentTier = 'free'
    reason = 'You\'re approaching the free tier limit. Consider upgrading soon.'
  } else {
    return {
      shouldUpgrade: false,
      currentTier,
      suggestedTier,
      reason: '',
    }
  }
  
  return {
    shouldUpgrade: suggestedTier !== currentTier,
    currentTier,
    suggestedTier,
    reason,
  }
}
