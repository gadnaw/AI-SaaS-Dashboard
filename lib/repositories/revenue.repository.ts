import { db } from '@/lib/db/client'
import type { Insertable, Selectable } from 'kysely'
import type { RevenueTable } from '@/lib/db/types'

export type Revenue = Selectable<RevenueTable>
export type NewRevenue = Insertable<RevenueTable>

/**
 * Get all revenue for an organization
 */
export async function getRevenueByOrg(orgId: string) {
  return await db
    .selectFrom('revenue')
    .selectAll()
    .where('organization_id', '=', orgId)
    .orderBy('date', 'desc')
    .execute()
}

/**
 * Get revenue by date range
 */
export async function getRevenueByDateRange(
  orgId: string,
  startDate: Date,
  endDate: Date
) {
  return await db
    .selectFrom('revenue')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .orderBy('date', 'desc')
    .execute()
}

/**
 * Get revenue grouped by category
 */
export async function getRevenueByCategory(orgId: string) {
  return await db
    .selectFrom('revenue')
    .select(['category', (eb) => eb.fn.sum<number>('amount').as('total'), (eb) => eb.fn.countAll<number>().as('count')])
    .where('organization_id', '=', orgId)
    .groupBy('category')
    .execute()
}

/**
 * Get revenue by customer
 */
export async function getRevenueByCustomer(orgId: string, customerId: string) {
  return await db
    .selectFrom('revenue')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('customer_id', '=', customerId)
    .orderBy('date', 'desc')
    .execute()
}

/**
 * Get revenue totals for organization
 */
export async function getRevenueTotals(orgId: string) {
  return await db
    .selectFrom('revenue')
    .select([
      (eb) => eb.fn.sum<number>('amount').as('total_revenue'),
      (eb) => eb.fn.countAll<number>().as('transaction_count'),
      (eb) => eb.fn.avg<number>('amount').as('avg_transaction'),
    ])
    .where('organization_id', '=', orgId)
    .executeTakeFirst()
}

/**
 * Get monthly revenue trend (last N months)
 */
export async function getMonthlyRevenueTrend(orgId: string, months: number = 12) {
  return await db
    .selectFrom('revenue')
    .select([
      (eb) => eb.raw("to_char(date, 'YYYY-MM')", [], 'month'),
      (eb) => eb.fn.sum<number>('amount').as('revenue'),
    ])
    .where('organization_id', '=', orgId)
    .groupByRaw("to_char(date, 'YYYY-MM')")
    .orderBy('month', 'desc')
    .limit(months)
    .execute()
}

/**
 * Create revenue record
 */
export async function createRevenue(revenue: NewRevenue) {
  return await db
    .insertInto('revenue')
    .values(revenue)
    .returningAll()
    .executeTakeFirstOrThrow()
}

/**
 * Get recent revenue (last N days)
 */
export async function getRecentRevenue(orgId: string, days: number = 30) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return await db
    .selectFrom('revenue')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('created_at', '>=', startDate)
    .orderBy('date', 'desc')
    .execute()
}

/**
 * Get revenue by category for a specific period
 */
export async function getRevenueByCategoryAndPeriod(
  orgId: string,
  startDate: Date,
  endDate: Date
) {
  return await db
    .selectFrom('revenue')
    .select(['category', (eb) => eb.fn.sum<number>('amount').as('total')])
    .where('organization_id', '=', orgId)
    .where('date', '>=', startDate)
    .where('date', '<=', endDate)
    .groupBy('category')
    .orderBy('total', 'desc')
    .execute()
}
