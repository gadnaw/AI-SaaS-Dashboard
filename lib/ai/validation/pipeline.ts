import {
  validateQueryDatabaseParams,
  validateGenerateChartParams,
  validateSummarizeDataParams,
  validateFilters,
  validateAggregations,
  validateColumnAccess,
  type ValidationResult,
} from './schema-validator'
import {
  isTableAllowed,
  getAllowedColumns,
  getAllowedAggregates,
  sanitizeColumnName,
} from './table-whitelist'

export type ValidationStage = 
  | 'schema'
  | 'table_whitelist'
  | 'column_validation'
  | 'rls_context'
  | 'sql_injection'
  | 'passed'

export interface ValidationContext {
  orgId: string
  userId?: string
  role?: 'admin' | 'member'
}

export interface ValidationError {
  stage: ValidationStage
  message: string
  field?: string
  suggestion?: string
}

export interface FullValidationResult<T> {
  success: boolean
  data?: T
  stage: ValidationStage
  errors: ValidationError[]
  warnings?: string[]
}

const SQL_INJECTION_PATTERNS = [
  /(\b)(select|insert|update|delete|drop|truncate|alter|create|exec|execute|union|join|--|\/\*)/i,
  /(\b)(or\s+\d+=\d+|and\s+\d+=\d+)/i,
  /(['"`;].*?['"`;])/,
  /(\b)(xp_|sp_|exec\s+)/i,
  /(\b)(0x[0-9a-fA-F]+)/i,
]

function containsSqlInjection(value: unknown): boolean {
  if (typeof value === 'string') {
    for (const pattern of SQL_INJECTION_PATTERNS) {
      if (pattern.test(value)) {
        return true
      }
    }
  }
  return false
}

function checkSqlInjection(params: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = []
  
  function checkObject(obj: unknown, path: string = '') {
    if (obj === null || obj === undefined) return
    
    if (typeof obj === 'string') {
      if (containsSqlInjection(obj)) {
        errors.push({
          stage: 'sql_injection',
          message: `Potential SQL injection detected in ${path}`,
          suggestion: 'Use parameterized queries instead of string concatenation',
        })
      }
      return
    }
    
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
        checkObject(value, path ? `${path}.${key}` : key)
      }
    }
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        checkObject(item, path ? `${path}[${index}]` : String(index))
      })
    }
  }
  
  checkObject(params)
  
  return errors
}

async function validateRLSContext(context: ValidationContext): Promise<ValidationError[]> {
  const errors: ValidationError[] = []
  
  if (!context.orgId) {
    errors.push({
      stage: 'rls_context',
      message: 'Organization ID (org_id) is required for RLS enforcement',
      suggestion: 'Ensure user is authenticated and belongs to an organization',
    })
  }
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (context.orgId && !uuidRegex.test(context.orgId)) {
    errors.push({
      stage: 'rls_context',
      message: 'Invalid organization ID format',
      suggestion: 'Organization ID must be a valid UUID',
    })
  }
  
  return errors
}

export async function validateQuery(
  params: unknown,
  context: ValidationContext,
  options?: { abortEarly?: boolean; stripUnknown?: boolean }
): Promise<FullValidationResult<unknown>> {
  const { abortEarly = true, stripUnknown = true } = options || {}
  const errors: ValidationError[] = []
  let warnings: string[] = []
  
  let data: unknown = params
  let currentStage: ValidationStage = 'passed'
  
  if (abortEarly && errors.length > 0) {
    return {
      success: false,
      data,
      stage: currentStage,
      errors,
    }
  }
  
  const schemaResult = validateQueryDatabaseParams(params, { stripUnknown, abortEarly })
  if (!schemaResult.success) {
    currentStage = 'schema'
    errors.push(...schemaResult.errors!.map(msg => ({
      stage: 'schema' as ValidationStage,
      message: msg,
      suggestion: 'Check the query parameters against the expected schema',
    })))
    if (abortEarly) {
      return { success: false, data, stage: currentStage, errors }
    }
  } else if (schemaResult.data) {
    data = schemaResult.data
  }
  
  const queryParams = data as { table?: string; filters?: Array<{ column: string; value: unknown }>; aggregations?: Array<{ field: string; function: string }> }
  
  if (queryParams.table) {
    const tableAllowed = isTableAllowed(queryParams.table)
    if (!tableAllowed) {
      currentStage = 'table_whitelist'
      errors.push({
        stage: 'table_whitelist',
        message: `Table '${queryParams.table}' is not accessible`,
        suggestion: `Use one of: ${Object.keys({ organizations: true, profiles: true, customers: true, revenue: true, activities: true }).join(', ')}`,
      })
      if (abortEarly) {
        return { success: false, data, stage: currentStage, errors }
      }
    }
    
    if (queryParams.filters && Array.isArray(queryParams.filters)) {
      const columnValidation = validateColumnAccess(queryParams.table, queryParams.filters.map(f => f.column))
      if (!columnValidation.valid && columnValidation.invalidColumns.length > 0) {
        currentStage = 'column_validation'
        errors.push({
          stage: 'column_validation',
          message: `Invalid columns: ${columnValidation.invalidColumns.join(', ')}`,
          suggestion: `Allowed columns for '${queryParams.table}': ${getAllowedColumns(queryParams.table).join(', ')}`,
        })
      }
      
      for (const filter of queryParams.filters) {
        const sanitizedColumn = sanitizeColumnName(filter.column)
        if (sanitizedColumn !== filter.column) {
          warnings.push(`Column '${filter.column}' was sanitized to '${sanitizedColumn}'`)
        }
      }
    }
    
    if (queryParams.aggregations && Array.isArray(queryParams.aggregations)) {
      const allowedAggregates = getAllowedAggregates(queryParams.table)
      for (const agg of queryParams.aggregations) {
        if (!allowedAggregates.includes(agg.function)) {
          warnings.push(`Aggregation '${agg.function}' may not be supported for table '${queryParams.table}'. Allowed: ${allowedAggregates.join(', ')}`)
        }
      }
    }
  }
  
  const rlsErrors = await validateRLSContext(context)
  if (rlsErrors.length > 0) {
    currentStage = 'rls_context'
    errors.push(...rlsErrors)
    if (abortEarly) {
      return { success: false, data, stage: currentStage, errors }
    }
  }
  
  const injectionErrors = checkSqlInjection(params as Record<string, unknown>)
  if (injectionErrors.length > 0) {
    currentStage = 'sql_injection'
    errors.push(...injectionErrors)
  }
  
  if (errors.length === 0) {
    currentStage = 'passed'
  }
  
  return {
    success: errors.length === 0,
    data: errors.length === 0 ? data : undefined,
    stage: currentStage,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

export async function validateChartGeneration(
  params: unknown,
  context: ValidationContext
): Promise<FullValidationResult<unknown>> {
  const errors: ValidationError[] = []
  let data: unknown = params
  
  const schemaResult = validateGenerateChartParams(params)
  if (!schemaResult.success) {
    errors.push(...schemaResult.errors!.map(msg => ({
      stage: 'schema' as ValidationStage,
      message: msg,
    })))
    return { success: false, data, stage: 'schema', errors }
  } else {
    data = schemaResult.data
  }
  
  const rlsErrors = await validateRLSContext(context)
  if (rl` Errors
    return { success: false, data, stage: 'rls_context', errors: rlsErrors }
  }
  
  return { success: true, data, stage: 'passed', errors }
}

export async function validateSummarization(
  params: unknown,
  context: ValidationContext
): Promise<FullValidationResult<unknown>> {
  const errors: ValidationError[] = []
  let data: unknown = params
  
  const schemaResult = validateSummarizeDataParams(params)
  if (!schemaResult.success) {
    errors.push(...schemaResult.errors!.map(msg => ({
      stage: 'schema' as ValidationStage,
      message: msg,
    })))
    return { success: false, data, stage: 'schema', errors }
  } else {
    data = schemaResult.data
  }
  
  const rlsErrors = await validateRLSContext(context)
  if (rlsErrors.length > 0) {
    return { success: false, data, stage: 'rls_context', errors: rlsErrors }
  }
  
  return { success: true, data, stage: 'passed', errors }
}
