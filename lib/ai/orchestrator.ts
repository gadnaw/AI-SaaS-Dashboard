import { streamText, tool, CoreMessage } from 'ai'
import { openai } from '@ai-sdk/openai'
import { createAIClient } from '@/ai/client'
import { validateQuery } from '@/ai/validation/pipeline'
import { queryDatabase } from '@/ai/functions/query-database'
import { generateChart } from '@/ai/functions/generate-chart'
import { summarizeData } from '@/ai/functions/summarize-data'
import { ChartConfiguration } from '@/ai/types/chart-configuration'
import { QueryResult } from '@/ai/types/query-result'
import { usageTracker } from '@/ai/cost/tracker'
import { checkLimit, getOptimalModel } from '@/ai/cost/limits'

export interface OrchestratedQuery {
  query: string
  orgId: string
  userId: string
  messages?: CoreMessage[]
  stream?: boolean
}

export interface OrchestratedResponse {
  text: string
  data?: {
    queryResult?: QueryResult<unknown>
    chartConfig?: ChartConfiguration
    summary?: string
  }
  usage?: {
    promptTokens: number
    completionTokens: number
    cost: number
  }
}

export async function orchestrateAIQuery(params: OrchestratedQuery): Promise<OrchestratedResponse> {
  const { query, orgId, userId, messages, stream = true } = params
  
  const model = getOptimalModel(query)
  
  const limitCheck = await checkLimit(orgId, Math.ceil(query.length / 4) + 500)
  
  if (!limitCheck.allowed) {
    return {
      text: `I apologize, but I'm unable to process your query at this time: ${limitCheck.reason}. Please try again later or contact support if you continue to experience issues.`,
    }
  }
  
  const tools = {
    queryDatabase: tool({
      parameters: {
        type: 'object',
        properties: {
          table: {
            type: 'string',
            enum: [
              'organizations',
              'profiles',
              'customers',
              'revenue',
              'activities',
              'audit_logs',
              'ai_usage_log',
              'user_preferences',
            ],
          },
          filters: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                column: { type: 'string' },
                operator: {
                  type: 'string',
                  enum: ['eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'contains', 'in'],
                },
                value: {},
              },
              required: ['column', 'operator', 'value'],
            },
          },
          aggregations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                function: {
                  type: 'string',
                  enum: ['count', 'sum', 'avg', 'min', 'max'],
                },
              },
              required: ['field', 'function'],
            },
          },
          groupBy: {
            type: 'array',
            items: { type: 'string' },
          },
          limit: { type: 'number', minimum: 1, maximum: 1000 },
          orderBy: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                direction: { type: 'string', enum: ['asc', 'desc'] },
              },
              required: ['field', 'direction'],
            },
          },
        },
        required: ['table'],
      },
      description: 'Execute a database query to retrieve data about customers, revenue, activities, and more. Use this for any specific data requests.',
      execute: async (params: {
        table: string
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
        orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>
      }) => {
        const validationResult = await validateQuery(params, { orgId, userId })
        
        if (!validationResult.success) {
          return {
            success: false,
            error: `Query validation failed: ${validationResult.errors.map(e => e.message).join('; ')}`,
            stage: validationResult.stage,
          }
        }
        
        const result = await queryDatabase(params, orgId)
        
        if (result.metadata.rowCount === 0) {
          return {
            success: true,
            data: [],
            message: 'No results found for your query. Try adjusting your filters.',
            metadata: result.metadata,
          }
        }
        
        return {
          success: true,
          data: result.data,
          metadata: result.metadata,
          aggregations: result.aggregations,
        }
      },
    }),

    generateChart: tool({
      parameters: {
        type: 'object',
        properties: {
          chartType: {
            type: 'string',
            enum: ['bar', 'line', 'area', 'pie', 'scatter'],
          },
          dataSource: {
            type: 'object',
            properties: {
              table: { type: 'string' },
              filters: { type: 'array' },
              aggregations: { type: 'array' },
              groupBy: { type: 'array' },
            },
            required: ['table'],
          },
          xAxis: { type: 'string' },
          yAxis: { type: 'array', items: { type: 'string' } },
          title: { type: 'string' },
          colors: { type: 'array', items: { type: 'string' } },
        },
        required: ['chartType', 'dataSource', 'xAxis', 'yAxis', 'title'],
      },
      description: 'Generate a chart configuration from data. Use this when the user wants to visualize data.',
      execute: async (params: {
        chartType: 'bar' | 'line' | 'area' | 'pie' | 'scatter'
        dataSource: {
          table: string
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
      }) => {
        const queryResult = await queryDatabase(params.dataSource, orgId)
        
        if (queryResult.metadata.rowCount === 0) {
          return {
            success: false,
            error: 'No data available to generate chart. Try adjusting your query.',
          }
        }
        
        const chartConfig = await generateChart(params, queryResult)
        
        return {
          success: true,
          chart: chartConfig,
          dataPoints: queryResult.metadata.rowCount,
        }
      },
    }),

    summarizeData: tool({
      parameters: {
        type: 'object',
        properties: {
          dataSource: {
            type: 'object',
            properties: {
              table: { type: 'string' },
              filters: { type: 'array' },
              aggregations: { type: 'array' },
              groupBy: { type: 'array' },
            },
            required: ['table'],
          },
          summaryType: {
            type: 'string',
            enum: ['trend', 'comparison', 'anomaly', 'summary'],
          },
          focusAreas: { type: 'array', items: { type: 'string' } },
          tone: {
            type: 'string',
            enum: ['neutral', 'insightful', 'actionable'],
          },
        },
        required: ['dataSource', 'summaryType'],
      },
      description: 'Generate a natural language summary of data. Use this to provide insights, trends, or comparisons.',
      execute: async (params: {
        dataSource: {
          table: string
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
        tone?: 'neutral' | 'insightful' | 'actionable'
      }) => {
        const queryResult = await queryDatabase(params.dataSource, orgId)
        
        if (queryResult.metadata.rowCount === 0) {
          return {
            success: false,
            error: 'No data available to summarize.',
          }
        }
        
        const summary = await summarizeData(
          {
            ...params,
            tone: params.tone || 'neutral',
          },
          queryResult
        )
        
        return {
          success: true,
          summary,
          dataPoints: queryResult.metadata.rowCount,
        }
      },
    }),
  }

  const systemPrompt = `You are a business intelligence assistant for a multi-tenant SaaS dashboard. Help users analyze their data through natural language queries.

Your capabilities:
1. Query databases for specific metrics, counts, and filtered results
2. Generate charts and visualizations from query results
3. Summarize data with trends, comparisons, and anomalies

Guidelines:
- Always use tools when users ask about specific data
- Provide context about what the data shows
- Suggest relevant filters when helpful
- Be accurate and concise
- Use appropriate aggregations (count, sum, avg, min, max)
- Format numbers for readability (1,234.56, $1.2M, etc.)

Tables available:
- organizations, profiles, customers, revenue, activities, audit_logs, ai_usage_log, user_preferences`

  const { text: responseText, usage } = await streamText({
    model: openai(model),
    messages: messages || [{ role: 'user', content: query }],
    system: systemPrompt,
    tools,
    maxTokens: 7500,
    temperature: 0.1,
  })

  if (usage) {
    await usageTracker.track(orgId, usage.promptTokens, usage.completionTokens)
  }

  return {
    query,
    orgId,
    userId,
    text: responseText,
  }
}

export async function processQuery(
  query: string,
  orgId: string,
  userId: string
): Promise<OrchestratedResponse> {
  const result = await orchestrateAIQuery({
    query,
    orgId,
    userId,
    stream: false,
  })

  return result
}

export function createStreamingResponse(query: string, orgId: string, userId: string) {
  return orchestrateAIQuery({
    query,
    orgId,
    userId,
    stream: true,
  })
}
