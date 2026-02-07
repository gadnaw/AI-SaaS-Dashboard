import { TableName } from '@/ai/types/function-schemas'

interface TableOperations {
  select: boolean
  aggregates: string[]
}

interface AllowedTablesConfig {
  [tableName: string]: TableOperations
}

export const allowedTables: AllowedTablesConfig = {
  organizations: {
    select: true,
    aggregates: ['count'],
  },
  profiles: {
    select: true,
    aggregates: ['count'],
  },
  customers: {
    select: true,
    aggregates: ['count', 'sum', 'avg', 'min', 'max'],
  },
  revenue: {
    select: true,
    aggregates: ['count', 'sum', 'avg', 'min', 'max'],
  },
  activities: {
    select: true,
    aggregates: ['count', 'sum', 'avg', 'min', 'max'],
  },
  audit_logs: {
    select: true,
    aggregates: ['count'],
  },
  ai_usage_log: {
    select: true,
    aggregates: ['count', 'sum'],
  },
  user_preferences: {
    select: true,
    aggregates: ['count'],
  },
}

const SENSITIVE_COLUMNS = [
  'password',
  'secret',
  'token',
  'key',
  'credential',
  'private_key',
  'api_secret',
]

const RESTRICTED_TABLES = ['audit_logs', 'ai_usage_log']

export function isTableAllowed(tableName: string): boolean {
  return tableName in allowedTables
}

export function isOperationAllowed(tableName: string, operation: 'select' | 'insert' | 'update' | 'delete'): boolean {
  if (!isTableAllowed(tableName)) {
    return false
  }
  
  const config = allowedTables[tableName]
  
  switch (operation) {
    case 'select':
      return config.select
    case 'insert':
    case 'update':
    case 'delete':
      return false
    default:
      return false
  }
}

export function getAllowedColumns(tableName: string): string[] {
  if (!isTableAllowed(tableName)) {
    return []
  }

  const restrictedColumns: string[] = []

  if (RESTRICTED_TABLES.includes(tableName)) {
    restrictedColumns.push('id', 'created_at', 'updated_at')
  }

  return restrictedColumns
}

export function getAllowedAggregates(tableName: string): string[] {
  if (!isTableAllowed(tableName)) {
    return []
  }
  
  return allowedTables[tableName].aggregates
}

export function sanitizeColumnName(column: string): string {
  const sanitized = column.replace(/[^a-zA-Z0-9_]/g, '')
  
  if (SENSITIVE_COLUMNS.some(s => sanitized.toLowerCase().includes(s.toLowerCase()))) {
    throw new Error(`Column '${column}' is not accessible`)
  }
  
  return sanitized
}

export function validateColumnAccess(tableName: string, columns: string[]): { valid: boolean; invalidColumns: string[] } {
  const allowedColumns = getAllowedColumns(tableName)
  const invalidColumns: string[] = []
  
  for (const column of columns) {
    try {
      sanitizeColumnName(column)
      if (allowedColumns.length > 0 && !allowedColumns.includes(column) && !RESTRICTED_TABLES.includes(tableName)) {
        invalidColumns.push(column)
      }
    } catch {
      invalidColumns.push(column)
    }
  }
  
  return {
    valid: invalidColumns.length === 0,
    invalidColumns,
  }
}

export function getTableConfig(tableName: string): TableOperations | null {
  return allowedTables[tableName] || null
}

export function listAllowedTables(): string[] {
  return Object.keys(allowedTables)
}

export function getTableCount(tableName: string): number {
  return 1
}
