import { z } from 'zod'
import {
  queryDatabaseSchema,
  generateChartSchema,
  summarizeDataSchema,
  filterSchema,
  aggregationSchema,
  orderBySchema,
  type QueryDatabaseParams,
  type GenerateChartParams,
  type SummarizeDataParams,
} from '../schema'

export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: string[]
  warnings?: string[]
}

function formatZodErrors(error: z.ZodError): string[] {
  return error.errors.map(err => {
    const path = err.path.join('.')
    return `Field '${path}': ${err.message}`
  })
}

export function validateSchema<T>(
  params: unknown,
  schema: z.ZodSchema<T>,
  options?: { stripUnknown?: boolean; abortEarly?: boolean }
): ValidationResult<T> {
  const { stripUnknown = true, abortEarly = false } = options || {}
  
  const parseOptions: z.ParseParams = {
    abortEarly,
  }
  
  try {
    let data: T
    
    if (stripUnknown) {
      const parsed = schema.safeParse(params, parseOptions)
      if (!parsed.success) {
        return {
          success: false,
          errors: formatZodErrors(parsed.error),
        }
      }
      data = parsed.data
    } else {
      const parsed = schema.safeParse(params, parseOptions)
      if (!parsed.success) {
        return {
          success: false,
          errors: formatZodErrors(parsed.error),
        }
      }
      data = parsed.data
    }
    
    return {
      success: true,
      data,
    }
  } catch (error) {
    return {
      success: false,
      errors: [`Unexpected validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
    }
  }
}

export function validateQueryDatabaseParams(
  params: unknown,
  options?: { stripUnknown?: boolean; abortEarly?: boolean }
): ValidationResult<QueryDatabaseParams> {
  return validateSchema(params, queryDatabaseSchema, options)
}

export function validateGenerateChartParams(
  params: unknown,
  options?: { stripUnknown?: boolean; abortEarly?: boolean }
): ValidationResult<GenerateChartParams> {
  return validateSchema(params, generateChartSchema, options)
}

export function validateSummarizeDataParams(
  params: unknown,
  options?: { stripUnknown?: boolean; abortEarly?: boolean }
): ValidationResult<SummarizeDataParams> {
  return validateSchema(params, summarizeDataSchema, options)
}

export function validateFilter(
  filter: unknown,
  options?: { stripUnknown?: boolean; abortEarly?: boolean }
): ValidationResult<z.infer<typeof filterSchema>> {
  return validateSchema(filter, filterSchema, options)
}

export function validateAggregation(
  aggregation: unknown,
  options?: { stripUnknown?: boolean; abortEarly?: boolean }
): ValidationResult<z.infer<typeof aggregationSchema>> {
  return validateSchema(aggregation, aggregationSchema, options)
}

export function validateOrderBy(
  orderBy: unknown,
  options?: { stripUnknown?: boolean; abortEarly?: boolean }
): ValidationResult<z.infer<typeof orderBySchema>> {
  return validateSchema(orderBy, orderBySchema, options)
}

export function validateFilters(
  filters: unknown[],
  options?: { stripUnknown?: boolean; abortEarly?: boolean }
): ValidationResult<z.infer<typeof filterSchema>[]> {
  const results: z.infer<typeof filterSchema>[] = []
  const allErrors: string[] = []
  
  if (!Array.isArray(filters)) {
    return {
      success: false,
      errors: ['Filters must be an array'],
    }
  }
  
  for (let i = 0; i < filters.length; i++) {
    const result = validateFilter(filters[i], options)
    if (result.success && result.data) {
      results.push(result.data)
    } else if (result.errors) {
      allErrors.push(...result.errors.map(e => `filters[${i}].${e}`))
    }
  }
  
  if (allErrors.length > 0) {
    return {
      success: false,
      errors: allErrors,
    }
  }
  
  return {
    success: true,
    data: results,
  }
}

export function validateAggregations(
  aggregations: unknown[],
  options?: { stripUnknown?: boolean; abortEarly?: boolean }
): ValidationResult<z.infer<typeof aggregationSchema>[]> {
  const results: z.infer<typeof aggregationSchema>[] = []
  const allErrors: string[] = []
  
  if (!Array.isArray(aggregations)) {
    return {
      success: false,
      errors: ['Aggregations must be an array'],
    }
  }
  
  for (let i = 0; i < aggregations.length; i++) {
    const result = validateAggregation(aggregations[i], options)
    if (result.success && result.data) {
      results.push(result.data)
    } else if (result.errors) {
      allErrors.push(...result.errors.map(e => `aggregations[${i}].${e}`))
    }
  }
  
  if (allErrors.length > 0) {
    return {
      success: false,
      errors: allErrors,
    }
  }
  
  return {
    success: true,
    data: results,
  }
}
