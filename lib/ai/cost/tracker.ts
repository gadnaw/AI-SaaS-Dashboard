import { Kysely, Generated } from 'kysely'
import { Database } from '@/lib/db/types'

export interface UsageRecord {
  id?: string
  orgId: string
  date: Date
  period_start: Date
  prompt_tokens: number
  completion_tokens: number
  cost: number
  created_at?: Generated<Date>
}

export interface TokenUsage {
  prompt: number
  completion: number
  total: number
  cost: number
}

export interface PeriodUsage {
  period: string
  promptTokens: number
  completionTokens: number
  totalTokens: number
  cost: number
  recordCount: number
}

const GPT_4O_PRICING = {
  prompt: 0.005,
  completion: 0.015,
}

const GPT_4O_MINI_PRICING = {
  prompt: 0.00015,
  completion: 0.0006,
}

export class UsageTracker {
  private db: Kysely<Database> | null = null

  private async getDb(): Promise<Kysely<Database>> {
    if (!this.db) {
      const { db } = await import('@/lib/db')
      this.db = db
    }
    return this.db
  }

  async initialize(): Promise<void> {
    const db = await this.getDb()
    
    await db.schema
      .createTable('ai_usage')
      .ifNotExists()
      .addColumn('id', 'uuid', col => col.primaryKey().defaultTo(db.schema.$cb().default))
      .addColumn('org_id', 'uuid', col => col.notNull())
      .addColumn('period_start', 'timestamp', col => col.notNull())
      .addColumn('prompt_tokens', 'integer', col => col.notNull().defaultTo(0))
      .addColumn('completion_tokens', 'integer', col => col.notNull().defaultTo(0))
      .addColumn('cost', 'decimal(10, 6)', col => col.notNull().defaultTo(0))
      .addColumn('created_at', 'timestamp', col => col.notNull().defaultTo(db.schema.$cb().now()))
      .addUniqueConstraint('ai_usage_org_period', ['org_id', 'period_start'])
      .execute()
  }

  private getCurrentPeriodStart(period: 'daily' | 'weekly' | 'monthly'): Date {
    const now = new Date()
    let periodStart: Date

    switch (period) {
      case 'daily':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        break
      case 'weekly':
        const dayOfWeek = now.getDay()
        periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - dayOfWeek,
          0,
          0,
          0,
          0
        )
        break
      case 'monthly':
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
        break
    }

    return periodStart
  }

  async track(
    orgId: string,
    promptTokens: number,
    completionTokens: number,
    options?: { model?: string; period?: 'daily' | 'weekly' | 'monthly' }
  ): Promise<void> {
    const db = await this.getDb()
    const period = options?.period || 'monthly'
    const periodStart = this.getCurrentPeriodStart(period)
    
    const pricing = options?.model?.includes('mini') 
      ? GPT_4O_MINI_PRICING 
      : GPT_4O_PRICING
    
    const cost = (promptTokens * pricing.prompt + completionTokens * pricing.completion) / 1000

    await db
      .insertInto('ai_usage')
      .values({
        org_id: orgId,
        period_start: periodStart,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        cost,
      })
      .onConflict(oc => oc.column('org_id').column('period_start'))
      .doUpdateSet({
        prompt_tokens: eb => eb.ref('excluded.prompt_tokens').plus(promptTokens),
        completion_tokens: eb => eb.ref('excluded.completion_tokens').plus(completionTokens),
        cost: eb => eb.ref('excluded.cost').plus(cost),
      })
      .execute()
  }

  async getUsage(
    orgId: string,
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<PeriodUsage> {
    const db = await this.getDb()
    const periodStart = this.getCurrentPeriodStart(period)

    const result = await db
      .selectFrom('ai_usage')
      .select([
        sql<number>`COALESCE(SUM(prompt_tokens), 0)`.as('prompt_tokens'),
        sql<number>`COALESCE(SUM(completion_tokens), 0)`.as('completion_tokens'),
        sql<number>`COALESCE(SUM(cost), 0)`.as('total_cost'),
        sql<number>`COALESCE(COUNT(*), 0)`.as('record_count'),
      ])
      .where('org_id', '=', orgId)
      .where('period_start', '>=', periodStart)
      .executeTakeFirst()

    const promptTokens = Number(result?.prompt_tokens || 0)
    const completionTokens = Number(result?.completion_tokens || 0)
    const cost = Number(result?.total_cost || 0)

    return {
      period,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      cost,
      recordCount: Number(result?.record_count || 0),
    }
  }

  async getUsageHistory(
    orgId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PeriodUsage[]> {
    const db = await this.getDb()

    const results = await db
      .selectFrom('ai_usage')
      .select([
        'period_start',
        sql<number>`SUM(prompt_tokens)`.as('prompt_tokens'),
        sql<number>`SUM(completion_tokens)`.as('completion_tokens'),
        sql<number>`SUM(cost)`.as('total_cost'),
        sql<number>`COUNT(*)`.as('record_count'),
      ])
      .where('org_id', '=', orgId)
      .where('period_start', '>=', startDate)
      .where('period_start', '<=', endDate)
      .groupBy('period_start')
      .orderBy('period_start', 'asc')
      .execute()

    return results.map(r => ({
      period: r.period_start.toISOString(),
      promptTokens: Number(r.prompt_tokens),
      completionTokens: Number(r.completion_tokens),
      totalTokens: Number(r.prompt_tokens) + Number(r.completion_tokens),
      cost: Number(r.total_cost),
      recordCount: Number(r.record_count),
    }))
  }

  async reset(
    orgId: string,
    period: 'daily' | 'weekly' | 'monthly'
  ): Promise<void> {
    const db = await this.getDb()
    const periodStart = this.getCurrentPeriodStart(period)

    await db
      .updateTable('ai_usage')
      .set({
        prompt_tokens: 0,
        completion_tokens: 0,
        cost: 0,
      })
      .where('org_id', '=', orgId)
      .where('period_start', '>=', periodStart)
      .execute()
  }

  async getTotalUsage(orgId: string): Promise<TokenUsage> {
    const db = await this.getDb()

    const result = await db
      .selectFrom('ai_usage')
      .select([
        sql<number>`COALESCE(SUM(prompt_tokens), 0)`.as('prompt'),
        sql<number>`COALESCE(SUM(completion_tokens), 0)`.as('completion'),
        sql<number>`COALESCE(SUM(cost), 0)`.as('total_cost'),
      ])
      .where('org_id', '=', orgId)
      .executeTakeFirst()

    const prompt = Number(result?.prompt || 0)
    const completion = Number(result?.completion || 0)

    return {
      prompt,
      completion,
      total: prompt + completion,
      cost: Number(result?.total_cost || 0),
    }
  }
}

export const usageTracker = new UsageTracker()

async function initTracker() {
  try {
    await usageTracker.initialize()
  } catch (error) {
    console.error('Failed to initialize usage tracker:', error)
  }
}

initTracker()

function sql<T>(strings: TemplateStringsArray): any {
  return {} as T
}
