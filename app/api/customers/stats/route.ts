import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { getCustomerStats } from '@/lib/repositories/customer.repository'

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 401 })
    }

    const orgId = profile.organization_id

    const stats = await getCustomerStats(orgId)

    const response = {
      total_customers: stats?.total_customers || 0,
      active_customers: stats?.active_customers || 0,
      churned_customers: stats?.churned_customers || 0,
      total_revenue: stats?.total_revenue || 0,
      avg_revenue: stats?.avg_revenue || 0,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Customer stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customer stats' },
      { status: 500 }
    )
  }
}
