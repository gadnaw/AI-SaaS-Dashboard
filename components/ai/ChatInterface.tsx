'use client'

import { useState, useRef, useEffect } from 'react'
import { User, Bot, Send, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QueryInput } from './QueryInput'
import { StreamingIndicator } from './StreamingIndicator'
import { AISummary } from './AISummary'
import { QuerySuggestions } from './QuerySuggestions'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  hasSummary?: boolean
  isStreaming?: boolean
}

interface ChatInterfaceProps {
  messages: Message[]
  onSend: (query: string) => void
  isStreaming?: boolean
  suggestions?: string[]
  className?: string
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <div
      className={cn(
        'flex gap-4 mb-6',
        isUser && 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Message bubble */}
      <div
        className={cn(
          'max-w-[70%] rounded-2xl px-5 py-3',
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-200 rounded-tl-sm'
        )}
      >
        <p className={cn('leading-relaxed', isUser ? 'text-white' : 'text-gray-700')}>
          {message.content}
        </p>
        <span
          className={cn(
            'text-xs mt-2 block',
            isUser ? 'text-blue-200' : 'text-gray-400'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}

export function ChatInterface({
  messages,
  onSend,
  isStreaming = false,
  suggestions = [],
  className,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isStreaming])

  // Hide suggestions after first user message
  useEffect(() => {
    if (messages.length > 0) {
      setShowSuggestions(false)
    }
  }, [messages.length])

  const handleSend = (query: string) => {
    onSend(query)
  }

  const handleSuggestionSelect = (suggestion: string) => {
    onSend(suggestion)
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Welcome state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Ask anything about your data
            </h2>
            <p className="text-gray-500 max-w-md mb-8">
              I can help you analyze trends, understand customer behavior, 
              and explore your business metrics using natural language.
            </p>
            {suggestions.length > 0 && (
              <QuerySuggestions
                suggestions={suggestions}
                onSelect={handleSuggestionSelect}
              />
            )}
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex gap-4 mb-6">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Bot size={14} className="text-white" />
            </div>
            <StreamingIndicator />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white p-4">
        <QueryInput
          onSubmit={handleSend}
          isStreaming={isStreaming}
          disabled={isStreaming}
          placeholder="Ask a question about your business data..."
        />
      </div>
    </div>
  )
}
