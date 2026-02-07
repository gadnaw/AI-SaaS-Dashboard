'use server'

import { enrollMFA, verifyEnrollment } from '@/lib/auth/mfa'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function startEnrollment() {
  return await enrollMFA()
}

export async function completeEnrollment(formData: FormData) {
  const factorId = formData.get('factorId') as string
  const code = formData.get('code') as string

  await verifyEnrollment(factorId, code)
  revalidatePath('/settings/security')
  redirect('/settings/security?enrolled=true')
}
