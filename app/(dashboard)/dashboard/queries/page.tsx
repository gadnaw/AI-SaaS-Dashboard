'use client'

import { useState } from 'react'
import { useMockAIQuery } from '@/lib/hooks/useAIQuery'
import { useQueryHistory } from '@/lib/hooks/useQueryHistory'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { QuerySuggestions } from '@/components/ai/QuerySuggestions'
import { AISummary } from '@/components/ai/AISummary'
import { ChartContainer } from '@/components/charts/ChartContainer'
import { RevenueChart } from '@/components/charts/RevenueChart'
import { cn } from '@/lib/utils'
import { FileText, History, Clock, X } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  hasSummary?: boolean
  isStreaming?: boolean
}

export default function QueriesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  const { mutate: sendQuery, isPending: isLoading } = useMockAIQuery()
  const { history, addQuery, isLoaded: historyLoaded } = useQueryHistory()

  const handleSend = (query: string) => {
    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])

    // Send to AI
    sendQuery(query, {
      onSuccess: (response) => {
        // Add AI message
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: response.summary,
          timestamp: new Date().toISOString(),
          hasSummary: true,
        }

        setMessages((prev) => {
          // Replace streaming indicator with actual message
          return [...prev.filter((m) => m.role !== 'assistant' || !m.isStreaming), aiMessage]
        })

        // Add to history
        addQuery(query, 'success')
      },
      onError: () => {
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your query. Please try again.',
          timestamp: new Date().toISOString(),
        }
        setMessages((prev) => [...prev, errorMessage])
        addQuery(query, 'error')
      },
    })
  }

  return (
    <div className="flex h-[calc(100vh-8rem)]">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 border border-gray-200 rounded-xl overflow-hidden bg-white">
          <ChatInterface
            messages={messages}
            onSend={handleSend}
            isStreaming={isLoading}
            suggestions={[
              'Show me revenue trends',
              'What are my top customers?',
              'Analyze customer churn',
              'Compare sales by region',
            ]}
          />
        </div>
      </div>

      {/* Results sidebar (shows after first query) */}
      {messages.some((m) => m.role === 'assistant') && (
        <div className="w-96 ml-6 space-y-6 overflow-y-auto">
          {/* AI Summary */}
          <AISummary
            summary={messages[messages.length - 1]?.content || ''}
            isStreaming={isLoading}
          />

          {/* Chart placeholder */}
          <ChartContainer title="Revenue Trend" loading={isLoading}>
            <RevenueChart
              data={[
                { date: 'Jan', revenue: 95000 },
                { date: 'Feb', revenue: 102000 },
                { date: 'Mar', revenue: 98000 },
                { date: 'Apr', revenue: 115000 },
                { date: 'May', revenue: 108000 },
                { date: 'Jun', revenue: 120000 },
                { date: 'Jul', revenue: 128450 },
              ]}
            />
          </ChartContainer>

          {/* Data table placeholder */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={18} className="text-gray-500" />
              <h3 className="font-semibold text-gray-900">Query Results</h3>
            </div>
            <div className="text-sm text-gray-500">
              Table data would appear here based on the AI query results.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
