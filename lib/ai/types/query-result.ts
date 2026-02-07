export interface QueryMetadata {
  rowCount: number
  executionTime: number
  cached: boolean
}

export interface AggregationResult {
  field: string
  value: number
  function: 'count' | 'sum' | 'avg' | 'min' | 'max'
}

export interface QueryResult<T> {
  data: T[]
  metadata: QueryMetadata
  aggregations?: AggregationResult[]
  groupedBy?: Record<string, T[]>
  pagination?: {
    page: number
    pageSize: number
    totalRows: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

export function createQueryMetadata(overrides?: Partial<QueryMetadata>): QueryMetadata {
  return {
    rowCount: 0,
    executionTime: 0,
    cached: false,
    ...overrides,
  }
}

export function createAggregationResult(
  field: string,
  value: number,
  func: 'count' | 'sum' | 'avg' | 'min' | 'max'
): AggregationResult {
  return { field, value, function: func }
}

export function createQueryResult<T>(
  data: T[],
  metadata: QueryMetadata,
  options?: {
    aggregations?: AggregationResult[]
    groupedBy?: Record<string, T[]>
    pagination?: QueryResult<T>['pagination']
  }
): QueryResult<T> {
  return {
    data,
    metadata,
    ...options,
  }
}

export function isQueryResult<T>(obj: unknown): obj is QueryResult<T> {
  if (obj === null || obj === undefined) {
    return false
  }
  
  const result = obj as Record<string, unknown>
  
  return (
    Array.isArray(result.data) &&
    typeof result.metadata === 'object' &&
    result.metadata !== null &&
    'rowCount' in result.metadata &&
    'executionTime' in result.metadata &&
    'cached' in result.metadata
  )
}

export type QueryResultData<T> = T extends QueryResult<infer U> ? U : never

export function extractQueryData<T extends QueryResult<unknown>>(result: T): T['data'] {
  return result.data
}

export function calculatePagination(
  totalRows: number,
  page: number,
  pageSize: number
): QueryResult<unknown>['pagination'] {
  const totalPages = Math.ceil(totalRows / pageSize)
  
  return {
    page,
    pageSize,
    totalRows,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }
}

export function createEmptyQueryResult<T>(): QueryResult<T> {
  return {
    data: [],
    metadata: {
      rowCount: 0,
      executionTime: 0,
      cached: false,
    },
  }
}

export function mergeQueryResults<T>(
  result1: QueryResult<T>,
  result2: QueryResult<T>
): QueryResult<T> {
  const mergedData = [...result1.data, ...result2.data]
  
  return {
    data: mergedData,
    metadata: {
      rowCount: mergedData.length,
      executionTime: result1.metadata.executionTime + result2.metadata.executionTime,
      cached: result1.metadata.cached && result2.metadata.cached,
    },
    aggregations: [
      ...(result1.aggregations || []),
      ...(result2.aggregations || []),
    ],
  }
}
