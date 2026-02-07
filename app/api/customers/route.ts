import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getCustomersByOrg, getCustomerById } from '@/lib/repositories/customer.repository'

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
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

    const url = new URL(request.url)
    const pathParts = url.pathname.split('/')
    const lastPart = pathParts[pathParts.length - 1]

    if (!isNaN(parseInt(lastPart)) && lastPart !== 'customers') {
      const customerId = lastPart
      const customer = await getCustomerById(orgId, customerId)

      if (!customer) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
      }

      return NextResponse.json(customer)
    }

    const customers = await getCustomersByOrg(orgId)

    return NextResponse.json(customers)
  } catch (error) {
    console.error('Customers API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch customers' },
      { status: 500 }
    )
  }
}
