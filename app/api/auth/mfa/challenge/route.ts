import { getSupabaseServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()

  const { factorId, code, challengeId } = await request.json()

  if (!factorId || !code || !challengeId) {
    return NextResponse.json(
      { error: 'Factor ID, challenge ID, and code are required' },
      { status: 400 }
    )
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  })

  if (error) {
    return NextResponse.json(
      { error: 'Invalid MFA code' },
      { status: 401 }
    )
  }

  return NextResponse.json({ success: true })
}
