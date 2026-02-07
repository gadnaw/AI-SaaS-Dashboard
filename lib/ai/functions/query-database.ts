import { Kysely, sql } from 'kysely'
import { Database } from '@/lib/db/types'
import { getOrgContext } from '@/lib/organizations'
import {
  QueryDatabaseParams,
  type QueryResult,
  type QueryMetadata,
  type AggregationResult,
  createQueryResult,
  createQueryMetadata,
  createAggregationResult,
  calculatePagination,
} from '@/ai/types/query-result'

interface QueryExecutionContext {
  orgId: string
  startTime: number
}

async function getExecutionContext(): Promise<QueryExecutionContext> {
  const { orgId } = await getOrgContext()
  
  if (!orgId) {
    throw new Error('Organization context required. User must be authenticated and belong to an organization.')
  }
  
  return {
    orgId,
    startTime: Date.now(),
  }
}

function buildFilterConditions(
  db: Kysely<Database>,
  filters: NonNullable<QueryDatabaseParams['filters']>
) {
  return filters.map(filter => {
    const { column, operator, value } = filter
    
    const columnRef = sql`${sql.id(column)}`
    
    switch (operator) {
      case 'eq':
        return sql`${columnRef} = ${value}`
      case 'ne':
        return sql`${columnRef} <> ${value}`
      case 'gt':
        return sql`${columnRef} > ${value}`
      case 'lt':
        return sql`${columnRef} < ${value}`
      case 'gte':
        return sql`${columnRef} >= ${value}`
      case 'lte':
        return sql`${columnRef} <= ${value}`
      case 'contains':
        return sql`${columnRef} ILIKE ${`%${value}%`}`
      case 'in':
        return sql`${columnRef} IN ${sql.join(Array.isArray(value) ? value : [value])}`
      default:
        return sql`FALSE`
    }
  })
}

async function executeSimpleQuery<T extends Record<string, unknown>>(
  db: Kysely<Database>,
  params: QueryDatabaseParams,
  context: QueryExecutionContext
): Promise<QueryResult<T>> {
  const { table, filters, aggregations, groupBy, limit, orderBy } = params
  
  let query = db
    .selectFrom(table as any)
    .selectAll()
    .where('org_id', '=', context.orgId)
  
  if (filters && filters.length > 0) {
    const conditions = buildFilterConditions(db, filters)
    query = query.where((eb: any) => sql.join(conditions, sql` AND `))
  }
  
  if (aggregations && aggregations.length > 0) {
    const selectExpressions = aggregations.map(agg => {
      switch (agg.function) {
        case 'count':
          return sql`COUNT(${sql.id(agg.field)}) AS ${sql.id(`${agg.field}_${agg.function}`)}`
        case 'sum':
          return sql`SUM(${sql.id(agg.field)}) AS ${sql.id(`${agg.field}_${agg.function}`)}`
        case 'avg':
          return sql`AVG(${sql.id(agg.field)}) AS ${sql.id(`${agg.field}_${agg.function}`)}`
        case 'min':
          return sql`MIN(${sql.id(agg.field)}) AS ${sql.id(`${agg.field}_${agg.function}`)}`
        case 'max':
          return sql`MAX(${sql.id(agg.field)}) AS ${sql.id(`${agg.field}_${agg.function}`)}`
        default:
          return sql`TRUE`
      }
    })
    
    query = query.select(selectExpressions)
  }
  
  if (groupBy && groupBy.length > 0) {
    query = query.groupBy(groupBy.map(col => sql.id(col)) as any)
  }
  
  if (orderBy && orderBy.length > 0) {
    for (const order of orderBy) {
      query = query.orderBy(sql.id(order.field) as any, order.direction)
    }
  }
  
  if (limit) {
    query = query.limit(Math.min(limit, 1000))
  }
  
  const startTime = Date.now()
  const results = await query.execute()
  const executionTime = Date.now() - startTime
  
  const aggregationResults: AggregationResult[] = []
  if (aggregations && aggregations.length > 0 && results.length > 0) {
    const firstRow = results[0] as Record<string, unknown>
    for (const agg of aggregations) {
      const columnName = `${agg.field}_${agg.function}`
      const value = firstRow[columnName]
      if (typeof value === 'number') {
        aggregationResults.push(createAggregationResult(agg.field, value, agg.function))
      }
    }
  }
  
  return createQueryResult<T>(
    results as T[],
    createQueryMetadata({
      rowCount: results.length,
      executionTime,
      cached: false,
    }),
    {
      aggregations: aggregationResults.length > 0 ? aggregationResults : undefined,
    }
  )
}

async function executePaginatedQuery<T extends Record<string, unknown>>(
  db: Kysely<Database>,
  params: QueryDatabaseParams & { page?: number; pageSize?: number },
  context: QueryExecutionContext
): Promise<QueryResult<T>> {
  const { page = 1, pageSize: ps = 50 } = params
  const pageSize = Math.min(ps, 100)
  const offset = (page - 1) * pageSize
  
  const { table, filters, orderBy } = params
  
  let baseQuery = db
    .selectFrom(table as any)
    .selectAll()
    .where('org_id', '=', context.orgId)
  
  if (filters && filters.length > 0) {
    const conditions = buildFilterConditions(db, filters)
    baseQuery = baseQuery.where((eb: any) => sql.join(conditions, sql` AND `))
  }
  
  const countQuery = baseQuery.select(sql`COUNT(*) AS total`.as('total'))
  const countResult = await countQuery.executeTakeFirst()
  const totalRows = parseInt(countResult?.total as string || '0', 10)
  
  let dataQuery = baseQuery
  
  if (orderBy && orderBy.length > 0) {
    for (const order of orderBy) {
      dataQuery = dataQuery.orderBy(sql.id(order.field) as any, order.direction)
    }
  }
  
  dataQuery = dataQuery.limit(pageSize).offset(offset)
  
  const startTime = Date.now()
  const results = await dataQuery.execute()
  const executionTime = Date.now() - startTime
  
  const pagination = calculatePagination(totalRows, page, pageSize)
  
  return createQueryResult<T>(
    results as T[],
    createQueryMetadata({
      rowCount: results.length,
      executionTime,
      cached: false,
    }),
    { pagination }
  )
}

export async function queryDatabase<T extends Record<string, unknown> = Record<string, unknown: QueryDatabaseParams>>(
  params,
  orgId?: string
): Promise<QueryResult<T>> {
  return await executeQueryWithAggregations<T>(params, orgId)
}

async function executeQueryWithAggregations<T extends Record<string, unknown>>(
  params: QueryDatabaseParams,
  orgId?: string
): Promise<QueryResult<T>> {
  const context = orgId
    ? { orgId, startTime: Date.now() }
    : await getExecutionContext()

  const { table, filters, aggregations, groupBy, limit, orderBy, page, pageSize } = params

  const { db } = await import('@/lib/db')

  let query = db
    .selectFrom(table as any)
    .$if(filters && filters.length > 0, (qb: any) => {
      const conditions = buildFilterConditions(db, filters)
      return qb.where((eb: any) => sql.join(conditions, sql` AND `))
    })

  if (aggregations && aggregations.length > 0) {
    const aggSelects = aggregations.map(agg => {
      switch (agg.function) {
        case 'count':
          return sql`COUNT(${sql.id(agg.field)}) AS ${sql.id(`${agg.field}_agg`)}`
        case 'sum':
          return sql`COALESCE(SUM(${sql.id(agg.field)}), 0) AS ${sql.id(`${agg.field}_agg`)}`
        case 'avg':
          return sql`COALESCE(AVG(${sql.id(agg.field)}), 0) AS ${sql.id(`${agg.field}_agg`)}`
        case 'min':
          return sql`MIN(${sql.id(agg.field)}) AS ${sql.id(`${agg.field}_agg`)}`
        case 'max':
          return sql`MAX(${sql.id(agg.field)}) AS ${sql.id(`${agg.field}_agg`)}`
        default:
          return sql`TRUE`
      }
    })
    query = query.select(aggSelects)
  }

  if (groupBy && groupBy.length > 0) {
    const groupBySelects = groupBy.map(col => sql.id(col))
    query = query.select(groupBySelects)
    query = query.groupBy(groupBySelects)
  }

  if (orderBy && orderBy.length > 0) {
    for (const order of orderBy) {
      const orderCol = aggregations?.some(a => a.field === order.field)
        ? sql`${sql.id(`${order.field}_agg`)}`
        : sql.id(order.field)
      query = query.orderBy(orderCol as any, order.direction)
    }
  }

  if (page && pageSize) {
    query = query.limit(pageSize).offset((page - 1) * pageSize)
  } else if (limit) {
    query = query.limit(Math.min(limit, 1000))
  }

  const startTime = Date.now()
  const results = await query.execute()
  const executionTime = Date.now() - startTime

  const aggResults: AggregationResult[] = []
  if (aggregations && aggregations.length > 0 && results.length > 0) {
    const firstRow = results[0] as Record<string, unknown>
    for (const agg of aggregations) {
      const columnName = `${agg.field}_agg`
      const value = firstRow[columnName]
      if (typeof value === 'number') {
        aggResults.push(createAggregationResult(agg.field, value, agg.function))
      }
    }
  }

  const groupedData: Record<string, T[]> = {}
  if (groupBy && groupBy.length > 0 && results.length > 0) {
    for (const row of results as Array<Record<string, unknown>>) {
      const groupKey = groupBy.map(col => String(row[col])).join('::')
      if (!groupedData[groupKey]) {
        groupedData[groupKey] = []
      }
      groupedData[groupKey].push(row as T)
    }
  }

  const pagination = page && pageSize
    ? calculatePagination(
        aggregations && aggregations.length > 0
          ? results.length
          : await countRecords(table as keyof Database, context.orgId),
        page,
        pageSize
      )
    : undefined

  return createQueryResult<T>(
    results as T[],
    createQueryMetadata({
      rowCount: results.length,
      executionTime,
      cached: false,
    }),
    {
      aggregations: aggResults.length > 0 ? aggResults : undefined,
      groupedBy: Object.keys(groupedData).length > 0 ? groupedData : undefined,
      pagination,
    }
  )
}
  const context = orgId
    ? { orgId, startTime: Date.now() }
    : await getExecutionContext()
  
  try {
    const { db } = await import('@/lib/db')
    
    if (params.page || params.pageSize) {
      return await executePaginatedQuery(db, params, context)
    }
    
    return await executeSimpleQuery(db, params, context)
  } catch (error) {
    const executionTime = Date.now() - context.startTime
    
    console.error('Query execution failed:', error)
    
    return {
      data: [],
      metadata: {
        rowCount: 0,
        executionTime,
        cached: false,
      },
      aggregations: [],
    }
  }
}

export async function countRecords(
  table: keyof Database,
  orgId?: string
): Promise<number> {
  const context = orgId
    ? { orgId, startTime: Date.now() }
    : await getExecutionContext()
  
  try {
    const { db } = await import('@/lib/db')
    
    const result = await db
      .selectFrom(table as any)
      .select(sql`COUNT(*) AS count`.as('count'))
      .where('org_id', '=', context.orgId)
      .executeTakeFirst()
    
    return parseInt(result?.count as string || '0', 10)
  } catch (error) {
    console.error('Count query failed:', error)
    return 0
  }
}

export async function aggregate(
  table: keyof Database,
  aggregation: {
    field: string
    function: 'count' | 'sum' | 'avg' | 'min' | 'max'
  },
  orgId?: string
): Promise<number | null> {
  const context = orgId
    ? { orgId, startTime: Date.now() }
    : await getExecutionContext()
  
  try {
    const { db } = await import('@/lib/db')
    
    let query = db
      .selectFrom(table as any)
      .select(sql`${sql.id(aggregation.field)}`.as('value'))
      .where('org_id', '=', context.orgId)
    
    switch (aggregation.function) {
      case 'count':
        query = query.select(sql`COUNT(*)`.as('agg'))
        break
      case 'sum':
        query = query.select(sql`SUM(${sql.id(aggregation.field)})`.as('agg'))
        break
      case 'avg':
        query = query.select(sql`AVG(${sql.id(aggregation.field)})`.as('agg'))
        break
      case 'min':
        query = query.select(sql`MIN(${sql.id(aggregation.field)})`.as('agg'))
        break
      case 'max':
        query = query.select(sql`MAX(${sql.id(aggregation.field)})`.as('agg'))
        break
    }
    
    const result = await query.executeTakeFirst()
    
    if ('agg' in result && typeof result.agg === 'number') {
      return result.agg
    }
    
    if ('value' in result && typeof result.value === 'number') {
      return result.value
    }
    
    return null
  } catch (error) {
    console.error('Aggregation query failed:', error)
    return null
  }
}
