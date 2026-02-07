// Stub cost limits - Phase 2 functionality
export interface LimitCheckResult {
  allowed: boolean
  reason?: string
  remaining?: number
}

export interface LimitsResult {
  monthly: {
    limit: number
    remaining: number
  }
}

export async function checkLimit(orgId: string, estimatedTokens: number): Promise<LimitCheckResult> {
  return { allowed: true, remaining: 10000 }
}

export function getOptimalModel(query: string): string {
  return 'gpt-4o-mini'
}

export async function getRemainingLimits(orgId: string): Promise<LimitsResult> {
  return {
    monthly: {
      limit: 100000,
      remaining: 90000
    }
  }
}
