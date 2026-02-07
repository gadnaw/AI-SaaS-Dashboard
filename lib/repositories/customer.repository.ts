import { db } from '@/lib/db/client'
import type { Insertable, Selectable } from 'kysely'
import type { CustomerTable } from '@/lib/db/types'

export type Customer = Selectable<CustomerTable>
export type NewCustomer = Insertable<CustomerTable>

/**
 * Get all customers for an organization (excluding soft-deleted)
 */
export async function getCustomersByOrg(orgId: string) {
  return await db
    .selectFrom('customers')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('deleted_at', 'is', null)
    .orderBy('name', 'asc')
    .execute()
}

/**
 * Get paginated customers for an organization
 */
export async function getCustomersPaginated(
  orgId: string,
  page: number = 1,
  limit: number = 20
) {
  const offset = (page - 1) * limit
  return await db
    .selectFrom('customers')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('deleted_at', 'is', null)
    .orderBy('name', 'asc')
    .limit(limit)
    .offset(offset)
    .execute()
}

/**
 * Get customer by ID (organization-scoped)
 */
export async function getCustomerById(orgId: string, customerId: string) {
  return await db
    .selectFrom('customers')
    .selectAll()
    .where('id', '=', customerId)
    .where('organization_id', '=', orgId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst()
}

/**
 * Get customer statistics for an organization
 */
export async function getCustomerStats(orgId: string) {
  return await db
    .selectFrom('customers')
    .select([
      (eb) => eb.fn.countAll<number>().as('total_customers'),
      (eb) =>
        eb
          .case()
          .when('status', '=', 'active')
          .then(eb.fn.countAll<number>())
          .end()
          .as('active_customers'),
      (eb) =>
        eb
          .case()
          .when('status', '=', 'churned')
          .then(eb.fn.countAll<number>())
          .end()
          .as('churned_customers'),
      (eb) => eb.fn.sum<number>('total_revenue').as('total_revenue'),
      (eb) => eb.fn.avg<number>('total_revenue').as('avg_revenue'),
    ])
    .where('organization_id', '=', orgId)
    .where('deleted_at', 'is', null)
    .executeTakeFirst()
}

/**
 * Create a new customer
 */
export async function createCustomer(customer: NewCustomer) {
  return await db
    .insertInto('customers')
    .values(customer)
    .returningAll()
    .executeTakeFirstOrThrow()
}

/**
 * Update a customer
 */
export async function updateCustomer(
  orgId: string,
  customerId: string,
  data: Partial<Customer>
) {
  return await db
    .updateTable('customers')
    .set({ ...data, updated_at: new Date() })
    .where('id', '=', customerId)
    .where('organization_id', '=', orgId)
    .returningAll()
    .executeTakeFirst()
}

/**
 * Soft delete a customer
 */
export async function softDeleteCustomer(orgId: string, customerId: string) {
  return await db
    .updateTable('customers')
    .set({ deleted_at: new Date() })
    .where('id', '=', customerId)
    .where('organization_id', '=', orgId)
    .execute()
}

/**
 * Get customers by status
 */
export async function getCustomersByStatus(
  orgId: string,
  status: 'active' | 'inactive' | 'churned'
) {
  return await db
    .selectFrom('customers')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('status', '=', status)
    .where('deleted_at', 'is', null)
    .orderBy('name', 'asc')
    .execute()
}

/**
 * Search customers by name or email
 */
export async function searchCustomers(orgId: string, searchTerm: string) {
  return await db
    .selectFrom('customers')
    .selectAll()
    .where('organization_id', '=', orgId)
    .where('deleted_at', 'is', null)
    .where((eb) =>
      eb.or([
        eb('name', 'ilike', `%${searchTerm}%`),
        eb('email', 'ilike', `%${searchTerm}%`),
        eb('company', 'ilike', `%${searchTerm}%`),
      ])
    )
    .orderBy('name', 'asc')
    .execute()
}
