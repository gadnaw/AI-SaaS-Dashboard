import { db } from '@/lib/db/client'
import type { Selectable } from 'kysely'
import type { ProfileTable } from '@/lib/db/types'

export type Profile = Selectable<ProfileTable>

/**
 * Get user profile by user ID
 */
export async function getUserProfile(userId: string) {
  return await db
    .selectFrom('profiles')
    .selectAll()
    .where('id', '=', userId)
    .executeTakeFirst()
}

/**
 * Get all profiles in an organization
 */
export async function getProfilesByOrg(orgId: string) {
  return await db
    .selectFrom('profiles')
    .selectAll()
    .where('organization_id', '=', orgId)
    .orderBy('created_at', 'asc')
    .execute()
}

/**
 * Update user profile
 */
export async function updateProfile(userId: string, data: Partial<Profile>) {
  return await db
    .updateTable('profiles')
    .set({ ...data, updated_at: new Date() })
    .where('id', '=', userId)
    .returningAll()
    .executeTakeFirst()
}

/**
 * Get profiles by role in an organization
 */
export async function getProfilesByRole(
  orgId: string,
  role: 'admin' | 'member'
) {
  return await db
    .selectFrom('profiles')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('role', '=', role)
    .orderBy('created_at', 'asc')
    .execute()
}

/**
 * Get admin profiles in an organization
 */
export async function getOrgAdmins(orgId: string) {
  return await db
    .selectFrom('profiles')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('role', '=', 'admin')
    .execute()
}

/**
 * Check if user is admin of organization
 */
export async function isUserOrgAdmin(userId: string, orgId: string) {
  const profile = await db
    .selectFrom('profiles')
    .select('role')
    .where('id', '=', userId)
    .where('organization_id', '=', orgId)
    .executeTakeFirst()

  return profile?.role === 'admin'
}

/**
 * Get profile with organization details
 */
export async function getProfileWithOrg(userId: string) {
  return await db
    .selectFrom('profiles')
    .selectAll()
    .innerJoin('organizations', 'profiles.organization_id', 'organizations.id')
    .select(['organizations.name', 'organizations.slug'])
    .where('profiles.id', '=', userId)
    .executeTakeFirst()
}
