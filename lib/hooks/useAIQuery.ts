'use client'

import { useMutation } from '@tanstack/react-query'

// Types for AI query response
export interface AIResponse {
  query: string
  summary: string
  chart?: {
    type: 'line' | 'bar' | 'pie'
    data: any[]
    config: any
  }
  table?: {
    columns: { key: string; label: string }[]
    rows: any[]
  }
  suggestions: string[]
  metadata: {
    tokensUsed: number
    queryTime: number
    timestamp: string
  }
}

interface AIQueryRequest {
  query: string
  context?: {
    dateRange?: { start: string; end: string }
    filters?: Record<string, any>
  }
}

async function sendAIQuery(request: AIQueryRequest): Promise<AIResponse> {
  const response = await fetch('/api/ai/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Query failed')
  }

  return response.json()
}

export function useAIQuery() {
  return useMutation({
    mutationFn: sendAIQuery,
    onSuccess: (data, variables) => {
      // Optionally handle success (e.g., analytics)
      console.log('Query completed:', data.metadata)
    },
    onError: (error, variables) => {
      console.error('Query failed:', error)
    },
  })
}

// Mock response for development
export function useMockAIQuery() {
  return useMutation({
    mutationFn: async (query: string): Promise<AIResponse> => {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      return {
        query,
        summary: `Based on the query "${query}", here's what I found: Your revenue has increased by 12.5% compared to last month, with a total of $128,450 generated. The growth is primarily driven by new customer acquisition in the enterprise segment.`,
        chart: {
          type: 'line',
          data: [
            { date: 'Jan', revenue: 95000 },
            { date: 'Feb', revenue: 102000 },
            { date: 'Mar', revenue: 98000 },
            { date: 'Apr', revenue: 115000 },
            { date: 'May', revenue: 108000 },
            { date: 'Jun', revenue: 120000 },
            { date: 'Jul', revenue: 128450 },
          ],
          config: {
            xAxisKey: 'date',
            dataKeys: ['revenue'],
            colors: ['#3b82f6'],
          },
        },
        table: {
          columns: [
            { key: 'month', label: 'Month' },
            { key: 'revenue', label: 'Revenue' },
            { key: 'change', label: 'Change' },
          ],
          rows: [
            { month: 'January', revenue: '$95,000', change: '+5.2%' },
            { month: 'February', revenue: '$102,000', change: '+7.4%' },
            { month: 'March', revenue: '$98,000', change: '-3.9%' },
            { month: 'April', revenue: '$115,000', change: '+17.3%' },
            { month: 'May', revenue: '$108,000', change: '-6.1%' },
            { month: 'June', revenue: '$120,000', change: '+11.1%' },
            { month: 'July', revenue: '$128,450', change: '+7.0%' },
          ],
        },
        suggestions: [
          'Show me customer acquisition trends',
          'What are the top performing products?',
          'Compare revenue by region',
          'Analyze churn rate this quarter',
        ],
        metadata: {
          tokensUsed: 450,
          queryTime: 1200,
          timestamp: new Date().toISOString(),
        },
      }
    },
  })
}
