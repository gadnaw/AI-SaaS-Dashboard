import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export interface AdminContext {
  userId: string
  organizationId: string
  role: 'admin' | 'member'
  hasMFA: boolean
}

/**
 * Require admin MFA - redirects to enrollment if admin without MFA
 */
export async function requireAdminMFA(): Promise<AdminContext> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Get user profile with role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login')
  }

  // Only admins need MFA enforcement
  if (profile.role !== 'admin') {
    return {
      userId: user.id,
      organizationId: profile.organization_id,
      role: 'member',
      hasMFA: false,
    }
  }

  // Check MFA status
  const { data: factors } = await supabase.auth.mfa.listFactors()
  const hasMFA = factors?.totp?.some(f => f.status === 'verified') ?? false

  if (!hasMFA) {
    // Redirect to MFA enrollment for admins without MFA
    redirect('/settings/security/enroll?required=true')
  }

  return {
    userId: user.id,
    organizationId: profile.organization_id,
    role: 'admin',
    hasMFA: true,
  }
}

/**
 * Require authenticated user - redirects to login if not authenticated
 */
export async function requireAuthenticated() {
  const supabase = await createServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return user
}

/**
 * Get current user context without redirecting
 */
export async function getUserContext() {
  const supabase = await createServerClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  return {
    userId: user.id,
    organizationId: profile?.organization_id,
    role: profile?.role as 'admin' | 'member' | null,
  }
}

/**
 * Check if current user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const context = await getUserContext()
  return context?.role === 'admin'
}

/**
 * Check if current user has MFA enabled
 */
export async function hasMFAEnabled(): Promise<boolean> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: factors } = await supabase.auth.mfa.listFactors()
  return factors?.totp?.some(f => f.status === 'verified') ?? false
}
