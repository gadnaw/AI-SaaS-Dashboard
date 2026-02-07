import { db } from '@/lib/db/client'
import type { Insertable, Selectable } from 'kysely'
import type { ActivityTable } from '@/lib/db/types'

export type Activity = Selectable<ActivityTable>
export type NewActivity = Insertable<ActivityTable>

/**
 * Get all activities for an organization
 */
export async function getActivitiesByOrg(orgId: string, limit: number = 100) {
  return await db
    .selectFrom('activities')
    .selectAll()
    .where('organization_id', '=', orgId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .execute()
}

/**
 * Get activities by type
 */
export async function getActivitiesByType(
  orgId: string,
  type: 'signup' | 'purchase' | 'churn' | 'login' | 'export'
) {
  return await db
    .selectFrom('activities')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('type', '=', type)
    .orderBy('created_at', 'desc')
    .execute()
}

/**
 * Get activities by customer
 */
export async function getCustomerActivities(orgId: string, customerId: string) {
  return await db
    .selectFrom('activities')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('customer_id', '=', customerId)
    .orderBy('created_at', 'desc')
    .execute()
}

/**
 * Get activity counts by type
 */
export async function getActivityCountsByType(orgId: string) {
  return await db
    .selectFrom('activities')
    .select(['type', (eb) => eb.fn.countAll<number>().as('count')])
    .where('organization_id', '=', orgId)
    .groupBy('type')
    .execute()
}

/**
 * Create activity record
 */
export async function createActivity(activity: NewActivity) {
  return await db
    .insertInto('activities')
    .values(activity)
    .returningAll()
    .executeTakeFirstOrThrow()
}

/**
 * Get recent activity count
 */
export async function getRecentActivityCount(orgId: string, days: number = 7) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return await db
    .selectFrom('activities')
    .select((eb) => eb.fn.countAll<number>().as('count'))
    .where('organization_id', '=', orgId)
    .where('created_at', '>=', startDate)
    .executeTakeFirst()
}

/**
 * Get activity timeline (paginated)
 */
export async function getActivityTimeline(
  orgId: string,
  page: number = 1,
  limit: number = 50
) {
  const offset = (page - 1) * limit

  return await db
    .selectFrom('activities')
    .selectAll()
    .where('organization_id', '=', orgId)
    .orderBy('created_at', 'desc')
    .limit(limit)
    .offset(offset)
    .execute()
}

/**
 * Get activities by date range
 */
export async function getActivitiesByDateRange(
  orgId: string,
  startDate: Date,
  endDate: Date
) {
  return await db
    .selectFrom('activities')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('created_at', '>=', startDate)
    .where('created_at', '<=', endDate)
    .orderBy('created_at', 'desc')
    .execute()
}

/**
 * Count activities by type for a period
 */
export async function getActivityStatsByType(
  orgId: string,
  days: number = 30
) {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return await db
    .selectFrom('activities')
    .select(['type', (eb) => eb.fn.countAll<number>().as('count')])
    .where('organization_id', '=', orgId)
    .where('created_at', '>=', startDate)
    .groupBy('type')
    .execute()
}
