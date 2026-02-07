import { createServerClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    }
  )

  const { factorId, code } = await request.json()

  if (!factorId || !code) {
    return NextResponse.json(
      { error: 'Factor ID and code are required' },
      { status: 400 }
    )
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
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
