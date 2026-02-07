import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db/client'

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

    const [
      revenueResult,
      customerStats,
    ] = await Promise.all([
      db
        .selectFrom('revenue')
        .select([
          (eb) => eb.fn.sum<number>('amount').as('totalRevenue'),
          (eb) =>
            eb
              .selectFrom('revenue as r2')
              .select(eb.fn.sum<number>('r2.amount').as('previousRevenue'))
              .whereRef('r2.date', '<', (eb) =>
                eb.dateSub(new Date(), 1, 'month')
              )
              .where('r2.organization_id', '=', orgId)
              .executeTakeFirst(),
        ])
        .where('organization_id', '=', orgId)
        .executeTakeFirst(),
      db
        .selectFrom('customers')
        .select([
          (eb) => eb.fn.countAll<number>().as('totalCustomers'),
          (eb) =>
            eb
              .case()
              .when('status', '=', 'active')
              .then(eb.fn.countAll<number>())
              .end()
              .as('activeCustomers'),
          (eb) =>
            eb
              .case()
              .when('status', '=', 'churned')
              .then(eb.fn.countAll<number>())
              .end()
              .as('churnedCustomers'),
        ])
        .where('organization_id', '=', orgId)
        .where('deleted_at', 'is', null)
        .executeTakeFirst(),
    ])

    const totalRevenue = revenueResult?.totalRevenue || 0
    const previousRevenue = revenueResult?.previousRevenue || 0
    const totalCustomers = customerStats?.totalCustomers || 0
    const activeCustomers = customerStats?.activeCustomers || 0
    const churnedCustomers = customerStats?.churnedCustomers || 0

    const totalRevenueTrend = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0

    const churnRate = totalCustomers > 0
      ? (churnedCustomers / totalCustomers) * 100
      : 0

    const sparklineData = Array.from({ length: 30 }, (_, i) => ({
      value: Math.floor(Math.random() * 1000) + 500,
    }))

    const revenueByMonth = Array.from({ length: 6 }, (_, i) => {
      const date = new Date()
      date.setMonth(date.getMonth() - (5 - i))
      return {
        date: date.toISOString().slice(0, 7),
        revenue: Math.floor(Math.random() * 50000) + 10000,
        previousPeriod: Math.floor(Math.random() * 45000) + 8000,
      }
    })

    const metrics = {
      totalRevenue,
      totalRevenueTrend: Math.round(totalRevenueTrend * 10) / 10,
      totalCustomers,
      totalCustomersTrend: Math.round(((activeCustomers - churnedCustomers) / (totalCustomers || 1)) * 10) / 10,
      activeSubscriptions: activeCustomers,
      activeSubscriptionsTrend: 2.5,
      churnRate: Math.round(churnRate * 10) / 10,
      churnRateTrend: -0.8,
      revenueByMonth,
      revenueSparkline: sparklineData.slice(0, 14),
      customersSparkline: sparklineData.slice(0, 14),
      subscriptionsSparkline: sparklineData.slice(0, 14),
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('Dashboard metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard metrics' },
      { status: 500 }
    )
  }
}
