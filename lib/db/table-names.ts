export const TABLE_NAMES = {
  ORGANIZATIONS: 'organizations',
  PROFILES: 'profiles',
  CUSTOMERS: 'customers',
  REVENUE: 'revenue',
  ACTIVITIES: 'activities',
  AUDIT_LOGS: 'audit_logs',
  AI_USAGE_LOG: 'ai_usage_log',
  USER_PREFERENCES: 'user_preferences',
} as const

export type TableName = typeof TABLE_NAMES[keyof typeof TABLE_NAMES]

/**
 * Get table name with type safety
 */
export function getTableName(name: TableName): string {
  return name
}
