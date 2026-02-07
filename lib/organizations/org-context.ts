import { createServerClient } from '@/lib/supabase/server'

export interface OrgContext {
  userId: string
  organizationId: string
  role: 'admin' | 'member'
}

/**
 * Retrieves the current user's organization context.
 * This function is required by Phase 2 (AI Query Engine) for multi-tenant isolation
 * and Phase 3 (Dashboard UI) for data fetching.
 *
 * @throws {Error} 'Unauthorized' - If user is not authenticated
 * @throws {Error} 'No organization context' - If user has no organization
 * @returns {Promise<OrgContext>} The user's context including user ID, organization ID, and role
 *
 * @example
 * const { userId, organizationId, role } = await getOrgContext()
 * // Used in Phase 2: AI query functions use orgId for RLS enforcement
 * // Used in Phase 3: Dashboard queries filter by organizationId
 */
export async function getOrgContext(): Promise<OrgContext> {
  const supabase = await createServerClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    throw new Error('No organization context')
  }

  return {
    userId: user.id,
    organizationId: profile.organization_id,
    role: profile.role as 'admin' | 'member',
  }
}

/**
 * Simplified version that returns null instead of throwing
 */
export async function getOrgContextOrNull(): Promise<OrgContext | null> {
  try {
    return await getOrgContext()
  } catch {
    return null
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const context = await getOrgContextOrNull()
  return context?.role === 'admin'
}

/**
 * Get only the organization ID
 */
export async function getOrganizationId(): Promise<string> {
  const context = await getOrgContext()
  return context.organizationId
}

/**
 * Get only the user ID
 */
export async function getUserId(): Promise<string> {
  const context = await getOrgContext()
  return context.userId
}
