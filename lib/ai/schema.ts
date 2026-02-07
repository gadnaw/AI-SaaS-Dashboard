import { z } from 'zod'

const OPERATORS = ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in'] as const
const AGGREGATION_FUNCTIONS = ['count', 'sum', 'avg', 'min', 'max'] as const
const CHART_TYPES = ['bar', 'line', 'area', 'pie', 'scatter'] as const
const SUMMARY_TYPES = ['trend', 'comparison', 'anomaly', 'summary'] as const
const TONES = ['neutral', 'insightful', 'actionable'] as const

export const filterSchema = z.object({
  column: z.string().min(1, 'Column name is required'),
  operator: z.enum(OPERATORS, {
    errorMap: () => ({ message: `Operator must be one of: ${OPERATORS.join(', ')}` }),
  }),
  value: z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(z.string()),
    z.array(z.number()),
  ]),
})

export const aggregationSchema = z.object({
  field: z.string().min(1, 'Aggregation field is required'),
  function: z.enum(AGGREGATION_FUNCTIONS, {
    errorMap: () => ({ message: `Function must be one of: ${AGGREGATION_FUNCTIONS.join(', ')}` }),
  }),
})

export const orderBySchema = z.object({
  field: z.string().min(1, 'Order by field is required'),
  direction: z.enum(['asc', 'desc']),
})

const baseTableSchema = z.object({
  filters: z.array(filterSchema).optional(),
  aggregations: z.array(aggregationSchema).optional(),
  groupBy: z.array(z.string()).optional(),
  limit: z.number().min(1).max(1000, 'Limit must be between 1 and 1000').optional(),
  orderBy: z.array(orderBySchema).optional(),
})

export const queryDatabaseSchema = baseTableSchema.extend({
  table: z.enum([
    'organizations',
    'profiles',
    'customers',
    'revenue',
    'activities',
    'audit_logs',
    'ai_usage_log',
    'user_preferences',
  ], {
    errorMap: () => ({ message: 'Invalid table name' }),
  }),
})

export type QueryDatabaseParams = z.infer<typeof queryDatabaseSchema>

export const generateChartSchema = z.object({
  chartType: z.enum(CHART_TYPES, {
    errorMap: () => ({ message: `Chart type must be one of: ${CHART_TYPES.join(', ')}` }),
  }),
  dataSource: baseTableSchema.extend({
    table: z.enum([
      'organizations',
      'profiles',
      'customers',
      'revenue',
      'activities',
      'audit_logs',
      'ai_usage_log',
      'user_preferences',
    ]),
  }),
  xAxis: z.string().min(1, 'X-axis field is required'),
  yAxis: z.array(z.string()).min(1, 'At least one Y-axis field is required'),
  title: z.string().min(1, 'Chart title is required'),
  colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Colors must be hex format')).optional(),
})

export type GenerateChartParams = z.infer<typeof generateChartSchema>

export const summarizeDataSchema = z.object({
  dataSource: baseTableSchema.extend({
    table: z.enum([
      'organizations',
      'profiles',
      'customers',
      'revenue',
      'activities',
      'audit_logs',
      'ai_usage_log',
      'user_preferences',
    ]),
  }),
  summaryType: z.enum(SUMMARY_TYPES, {
    errorMap: () => ({ message: `Summary type must be one of: ${SUMMARY_TYPES.join(', ')}` }),
  }),
  focusAreas: z.array(z.string()).optional(),
  tone: z.enum(TONES, {
    errorMap: () => ({ message: `Tone must be one of: ${TONES.join(', ')}` }),
  }),
})

export type SummarizeDataParams = z.infer<typeof summarizeDataSchema>

export const functionSchemas = {
  queryDatabase: queryDatabaseSchema,
  generateChart: generateChartSchema,
  summarizeData: summarizeDataSchema,
}

export {
  OPERATORS,
  AGGREGATION_FUNCTIONS,
  CHART_TYPES,
  SUMMARY_TYPES,
  TONES,
}
