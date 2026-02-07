'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createServerClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createServerClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const organizationName = formData.get('organizationName') as string

  // Validate required fields
  if (!email || !password || !organizationName) {
    return { error: 'All fields are required' }
  }

  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  // Generate slug from organization name
  const slug = organizationName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Create organization first
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: organizationName, slug })
    .select()
    .single()

  if (orgError) {
    return { error: 'Failed to create organization: ' + orgError.message }
  }

  // Sign up user with organization_id and role in metadata
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        organization_id: org.id,
        role: 'admin',
        full_name: email.split('@')[0],
      },
    },
  })

  if (signUpError) {
    // Clean up organization if signup fails
    await supabase.from('organizations').delete().eq('id', org.id)
    return { error: 'Failed to create account: ' + signUpError.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createServerClient()
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'Email is required' }
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Password reset email sent' }
}

export async function resetPassword(newPassword: string, confirmPassword: string) {
  const supabase = await createServerClient()

  if (newPassword !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  if (newPassword.length < 8) {
    return { error: 'Password must be at least 8 characters' }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true, message: 'Password updated successfully' }
}
