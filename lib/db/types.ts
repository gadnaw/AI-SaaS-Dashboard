import {
  Generated,
  JSONColumnType,
  Selectable,
  Insertable,
  Updateable,
} from 'kysely'

// ============================================================================
// Table Interfaces
// ============================================================================

export interface OrganizationTable {
  id: Generated<string>
  name: string
  slug: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface ProfileTable {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  organization_id: string | null
  role: 'admin' | 'member'
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface CustomerTable {
  id: Generated<string>
  organization_id: string
  name: string
  email: string | null
  company: string | null
  industry: string | null
  total_revenue: Generated<number>
  last_purchase_date: Date | null
  status: 'active' | 'inactive' | 'churned'
  deleted_at: Date | null
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface RevenueTable {
  id: Generated<string>
  organization_id: string
  customer_id: string | null
  amount: number
  date: Date
  category: string | null
  description: string | null
  created_at: Generated<Date>
}

export interface ActivityTable {
  id: Generated<string>
  organization_id: string
  type: 'signup' | 'purchase' | 'churn' | 'login' | 'export'
  customer_id: string | null
  metadata: Generated<JSONColumnType<Record<string, unknown>>>
  created_at: Generated<Date>
}

export interface AuditLogTable {
  id: Generated<string>
  organization_id: string
  user_id: string
  action: string
  table_name: string
  record_id: string | null
  old_data: JSONColumnType<Record<string, unknown>> | null
  new_data: JSONColumnType<Record<string, unknown>> | null
  created_at: Generated<Date>
}

export interface AIUsageLogTable {
  id: Generated<string>
  user_id: string
  organization_id: string
  query_id: string
  input_tokens: Generated<number>
  output_tokens: Generated<number>
  cost_usd: Generated<number>
  model: string
  date: Date
  created_at: Generated<Date>
}

export interface UserPreferencesTable {
  user_id: string
  theme_preference: 'light' | 'dark' | 'system'
  updated_at: Generated<Date>
}

// ============================================================================
// Database Interface
// ============================================================================

export interface Database {
  organizations: OrganizationTable
  profiles: ProfileTable
  customers: CustomerTable
  revenue: RevenueTable
  activities: ActivityTable
  audit_logs: AuditLogTable
  ai_usage_log: AIUsageLogTable
  user_preferences: UserPreferencesTable
}

// ============================================================================
// Type Aliases (Selectable, Insertable, Updateable)
// ============================================================================

// Organization
export type Organization = Selectable<OrganizationTable>
export type NewOrganization = Insertable<OrganizationTable>
export type OrganizationUpdate = Updateable<OrganizationTable>

// Profile
export type Profile = Selectable<ProfileTable>
export type NewProfile = Insertable<ProfileTable>
export type ProfileUpdate = Updateable<ProfileTable>

// Customer
export type Customer = Selectable<CustomerTable>
export type NewCustomer = Insertable<CustomerTable>
export type CustomerUpdate = Updateable<CustomerTable>

// Revenue
export type Revenue = Selectable<RevenueTable>
export type NewRevenue = Insertable<RevenueTable>
export type RevenueUpdate = Updateable<RevenueTable>

// Activity
export type Activity = Selectable<ActivityTable>
export type NewActivity = Insertable<ActivityTable>
export type ActivityUpdate = Updateable<ActivityTable>

// Audit Log
export type AuditLog = Selectable<AuditLogTable>
export type NewAuditLog = Insertable<AuditLogTable>
export type AuditLogUpdate = Updateable<AuditLogTable>

// AI Usage Log
export type AIUsageLog = Selectable<AIUsageLogTable>
export type NewAIUsageLog = Insertable<AIUsageLogTable>
export type AIUsageLogUpdate = Updateable<AIUsageLogTable>

// User Preferences
export type UserPreferences = Selectable<UserPreferencesTable>
export type NewUserPreferences = Insertable<UserPreferencesTable>
export type UserPreferencesUpdate = Updateable<UserPreferencesTable>

// ============================================================================
// Enum Types
// ============================================================================

export type ProfileRole = 'admin' | 'member'
export type CustomerStatus = 'active' | 'inactive' | 'churned'
export type ActivityType = 'signup' | 'purchase' | 'churn' | 'login' | 'export'
export type ThemePreference = 'light' | 'dark' | 'system'
