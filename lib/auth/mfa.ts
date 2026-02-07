import { createServerClient } from '@/lib/supabase/server'

export interface MFAEnrollmentResult {
  qrCode: string // Data URL for QR code image
  secret: string // TOTP secret for manual entry
  factorId: string // Factor ID for verification
}

export interface MFAStatus {
  enabled: boolean
  factors: Array<{
    id: string
    factorType: string
    status: 'verified' | 'unverified'
    friendlyName: string
  }>
}

/**
 * Initiates MFA enrollment, returns QR code and secret
 */
export async function enrollMFA(): Promise<MFAEnrollmentResult> {
  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: 'Authenticator App',
  })

  if (error) {
    throw new Error('Failed to enroll MFA: ' + error.message)
  }

  return {
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    factorId: data.id,
  }
}

/**
 * Verifies TOTP code during enrollment
 */
export async function verifyEnrollment(factorId: string, code: string) {
  const supabase = await createServerClient()

  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  })

  if (error) {
    throw new Error('Invalid verification code: ' + error.message)
  }

  return { success: true }
}

/**
 * Returns MFA enabled status and factors
 */
export async function checkMFAStatus(): Promise<MFAStatus> {
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { enabled: false, factors: [] }
  }

  const { data: factors } = await supabase.auth.mfa.listFactors()

  return {
    enabled: factors?.totp?.some(f => f.status === 'verified') ?? false,
    factors: factors?.all ?? [],
  }
}

/**
 * Verifies MFA before executing sensitive action
 */
export async function verifyMFAForAction(
  factorId: string,
  code: string,
  action: () => Promise<void>
): Promise<void> {
  const supabase = await createServerClient()

  // First verify MFA
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    code,
  })

  if (verifyError) {
    throw new Error('Invalid MFA code')
  }

  // Then execute the action
  await action()
}

/**
 * Get list of MFA factors for user
 */
export async function getMFAFactors() {
  const supabase = await createServerClient()

  const { data: factors } = await supabase.auth.mfa.listFactors()
  return factors?.all ?? []
}

/**
 * Unenroll an MFA factor
 */
export async function unenrollMFA(factorId: string) {
  const supabase = await createServerClient()

  const { error } = await supabase.auth.mfa.unenroll({
    factorId,
  })

  if (error) {
    throw new Error('Failed to unenroll MFA factor: ' + error.message)
  }

  return { success: true }
}
