import { db } from '@/lib/db/client'
import type { Insertable, Selectable } from 'kysely'
import type { OrganizationTable } from '@/lib/db/types'

export type Organization = Selectable<OrganizationTable>
export type NewOrganization = Insertable<OrganizationTable>

/**
 * Get organization by ID
 */
export async function getOrganizationById(orgId: string) {
  return await db
    .selectFrom('organizations')
    .selectAll()
    .where('id', '=', orgId)
    .executeTakeFirst()
}

/**
 * Get organization by slug
 */
export async function getOrganizationBySlug(slug: string) {
  return await db
    .selectFrom('organizations')
    .selectAll()
    .where('slug', '=', slug)
    .executeTakeFirst()
}

/**
 * Update organization
 */
export async function updateOrganization(
  orgId: string,
  data: Partial<Organization>
) {
  return await db
    .updateTable('organizations')
    .set({ ...data, updated_at: new Date() })
    .where('id', '=', orgId)
    .returningAll()
    .executeTakeFirst()
}

/**
 * Check if organization slug is available
 */
export async function isSlugAvailable(slug: string, excludeOrgId?: string) {
  let query = db
    .selectFrom('organizations')
    .select('id')
    .where('slug', '=', slug)

  if (excludeOrgId) {
    query = query.where('id', '!=', excludeOrgId)
  }

  const result = await query.executeTakeFirst()
  return !result
}

/**
 * Get organization statistics (member count, etc.)
 */
export async function getOrganizationStats(orgId: string) {
  return await db
    .selectFrom('organizations')
    .select((eb) => [
      eb.fn.countAll<number>().as('total_members'),
      eb
        .selectFrom('profiles')
        .select(eb.fn.countAll<number>().as('admin_count'))
        .where('organization_id', '=', orgId)
        .where('role', '=', 'admin')
        .limit(1)
        .as('admin_count'),
    ])
    .where('id', '=', orgId)
    .executeTakeFirst()
}
