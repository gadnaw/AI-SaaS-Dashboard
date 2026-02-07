import {
  queryDatabaseSchema,
  generateChartSchema,
  summarizeDataSchema,
  filterSchema,
  aggregationSchema,
  orderBySchema,
} from '../schema'

export type QueryDatabaseParams = z.infer<typeof queryDatabaseSchema>
export type GenerateChartParams = z.infer<typeof generateChartSchema>
export type SummarizeDataParams = z.infer<typeof summarizeDataSchema>
export type FilterParams = z.infer<typeof filterSchema>
export type AggregationParams = z.infer<typeof aggregationSchema>
export type OrderByParams = z.infer<typeof orderBySchema>

export type TableName = QueryDatabaseParams['table']
export type ChartType = GenerateChartParams['chartType']
export type SummaryType = SummarizeDataParams['summaryType']
export type Tone = SummarizeDataParams['tone']
export type FilterOperator = FilterParams['operator']
export type AggregationFunction = AggregationParams['function']

export function isValidTableName(value: string): value is TableName {
  return [
    'organizations',
    'profiles',
    'customers',
    'revenue',
    'activities',
    'audit_logs',
    'ai_usage_log',
    'user_preferences',
  ].includes(value)
}

export function isValidChartType(value: string): value is ChartType {
  return ['bar', 'line', 'area', 'pie', 'scatter'].includes(value)
}

export function isValidSummaryType(value: string): value is SummaryType {
  return ['trend', 'comparison', 'anomaly', 'summary'].includes(value)
}

export function isValidFilterOperator(value: string): value is FilterOperator {
  return ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in'].includes(value)
}

export function isValidAggregationFunction(value: string): value is AggregationFunction {
  return ['count', 'sum', 'avg', 'min', 'max'].includes(value)
}

export interface QueryDatabaseFunction {
  (params: QueryDatabaseParams, orgId: string): Promise<QueryResult<unknown>>
  schema: typeof queryDatabaseSchema
}

export interface GenerateChartFunction {
  (params: GenerateChartParams, queryResult: QueryResult<unknown>): Promise<ChartConfiguration>
  schema: typeof generateChartSchema
}

export interface SummarizeDataFunction {
  (params: SummarizeDataParams, queryResult: QueryResult<unknown>): Promise<string>
  schema: typeof summarizeDataSchema
}

export const functionSchemaReferences = {
  queryDatabase: queryDatabaseSchema,
  generateChart: generateChartSchema,
  summarizeData: summarizeDataSchema,
} as const

export type FunctionName = keyof typeof functionSchemaReferences

export function getFunctionSchema(name: FunctionName) {
  return functionSchemaReferences[name]
}
