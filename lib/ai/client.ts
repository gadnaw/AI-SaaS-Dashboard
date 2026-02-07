import { streamText, tool } from 'ai'
import { openai } from '@ai-sdk/openai'
import { queryDatabaseSchema, generateChartSchema, summarizeDataSchema } from './schema'
import { queryDatabase } from '@/ai/functions/query-database'
import { generateChart } from '@/ai/functions/generate-chart'
import { summarizeData } from '@/ai/functions/summarize-data'
import { validateQuery } from '@/ai/validation/pipeline'
import { ChartConfiguration } from '@/ai/types/chart-configuration'

export interface AIResponse {
  text: string
  functionResults?: Array<{
    tool: string
    result: unknown
  }>
}

export interface OrchestratorOptions {
  model?: 'gpt-4o' | 'gpt-4o-mini'
  maxTokens?: number
  temperature?: number
}

const DEFAULT_MODEL = 'gpt-4o' as const
const MAX_TOKENS = 7500
const TEMPERATURE = 0.1

export async function createAIClient(
  query: string,
  orgId: string,
  options: OrchestratorOptions = {}
): Promise<{
  stream: ReadableStream
  tools: Record<string, typeof import('ai').tool>
}> {
  const { model = DEFAULT_MODEL, maxTokens = MAX_TOKENS, temperature = TEMPERATURE } = options

  const tools = {
    queryDatabase: tool({
      parameters: queryDatabaseSchema,
      description: 'Execute a database query to retrieve data. Use for questions about specific data, counts, aggregations, or filtered results.',
      execute: async (params: {
        table: 'organizations' | 'profiles' | 'customers' | 'revenue' | 'activities' | 'audit_logs' | 'ai_usage_log' | 'user_preferences'
        filters?: Array<{
          column: string
          operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'
          value: string | number | boolean | null | Array<string | number>
        }>
        aggregations?: Array<{
          field: string
          function: 'count' | 'sum' | 'avg' | 'min' | 'max'
        }>
        groupBy?: string[]
        limit?: number
        orderBy?: Array<{
          field: string
          direction: 'asc' | 'desc'
        }>
      }) => {
        const validationResult = await validateQuery(params, { orgId })
        if (!validationResult.success) {
          return {
            success: false,
            error: validationResult.errors?.join('; ') || 'Validation failed',
            stage: validationResult.stage,
          }
        }
        return await queryDatabase(params, orgId)
      },
    }),

    generateChart: tool({
      parameters: generateChartSchema,
      description: 'Generate a chart configuration from query results. Use when the user wants to visualize data.',
      execute: async (params: {
        chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter'
        dataSource: {
          table: 'organizations' | 'profiles' | 'customers' | 'revenue' | 'activities' | 'audit_logs' | 'ai_usage_log' | 'user_preferences'
          filters?: Array<{
            column: string
            operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'
            value: string | number | boolean | null | Array<string | number>
          }>
          aggregations?: Array<{
            field: string
            function: 'count' | 'sum' | 'avg' | 'min' | 'max'
          }>
          groupBy?: string[]
        }
        xAxis: string
        yAxis: string[]
        title: string
        colors?: string[]
      }): Promise<ChartConfiguration | { success: boolean; error: string }> => {
        const queryResult = await queryDatabase(params.dataSource, orgId)
        if ('success' in queryResult && !queryResult.success) {
          return { success: false, error: queryResult.error || 'Query failed' }
        }
        return await generateChart(params, queryResult)
      },
    }),

    summarizeData: tool({
      parameters: summarizeDataSchema,
      description: 'Generate a natural language summary of data. Use for insights, trends, comparisons, or anomalies.',
      execute: async (params: {
        dataSource: {
          table: 'organizations' | 'profiles' | 'customers' | 'revenue' | 'activities' | 'audit_logs' | 'ai_usage_log' | 'user_preferences'
          filters?: Array<{
            column: string
            operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'in'
            value: string | number | boolean | null | Array<string | number>
          }>
          aggregations?: Array<{
            field: string
            function: 'count' | 'sum' | 'avg' | 'min' | 'max'
          }>
          groupBy?: string[]
        }
        summaryType: 'trend' | 'comparison' | 'anomaly' | 'summary'
        focusAreas?: string[]
        tone: 'neutral' | 'insightful' | 'actionable'
      }): Promise<string | { success: boolean; error: string }> => {
        const queryResult = await queryDatabase(params.dataSource, orgId)
        if ('success' in queryResult && !queryResult.success) {
          return { success: false, error: queryResult.error || 'Query failed' }
        }
        return await summarizeData(params, queryResult)
      },
    }),
  }

  const result = streamText({
    model: openai(model),
    maxTokens,
    temperature,
    tools,
    system: `You are a business intelligence assistant for a multi-tenant SaaS dashboard. Your role is to help users analyze their business data through natural language queries.

Key capabilities:
1. **Query Data**: Use queryDatabase to retrieve specific data from tables (customers, revenue, activities, etc.)
2. **Visualize Data**: Use generateChart to create chart configurations from query results
3. **Summarize Insights**: Use summarizeData to generate natural language insights about data patterns

Guidelines:
- Always use tools when the user asks about specific data, metrics, or trends
- Validate query parameters before execution
- Provide helpful context about what the data shows
- Use appropriate aggregations (count, sum, avg, min, max) for metrics
- Suggest relevant filters to refine results when helpful
- Consider time-based trends and comparisons

Tables available:
- organizations: Company/org details
- profiles: User profiles and roles
- customers: Customer information and status
- revenue: Revenue transactions and categories
- activities: User activities (signup, purchase, churn, login, export)
- audit_logs: System audit trail
- ai_usage_log: AI query usage tracking
- user_preferences: User settings

Always prioritize accuracy and relevance in your responses.`,
    prompt: query,
  })

  return { stream: result.toDataStreamResponse().body!, tools }
}

export type { AIResponse }
