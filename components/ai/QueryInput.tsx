'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QueryInputProps {
  onSubmit: (query: string) => void
  isStreaming?: boolean
  disabled?: boolean
  placeholder?: string
}

export function QueryInput({
  onSubmit,
  isStreaming = false,
  disabled = false,
  placeholder = 'Ask a question about your data...',
}: QueryInputProps) {
  const [query, setQuery] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [query])

  const handleSubmit = () => {
    if (!query.trim() || disabled || isStreaming) return
    onSubmit(query.trim())
    setQuery('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter to submit (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 transition-colors',
        isFocused
          ? 'border-blue-500 bg-white'
          : 'border-gray-200 bg-gray-50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {/* AI indicator */}
      <div className="absolute left-4 top-3 flex items-center gap-2 text-sm text-gray-500">
        <Sparkles size={16} className="text-blue-500" />
        <span>AI Assistant</span>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        className="w-full pt-10 pb-4 px-4 bg-transparent resize-none focus:outline-none text-gray-900 placeholder:text-gray-400"
      />

      {/* Footer */}
      <div className="flex items-center justify-between px-4 pb-3">
        {/* Helper text */}
        <div className="text-xs text-gray-400">
          Press{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">
            Enter
          </kbd>{' '}
          to send,{' '}
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600 font-mono">
            Shift + Enter
          </kbd>{' '}
          for new line
        </div>

        {/* Send button */}
        <button
          onClick={handleSubmit}
          disabled={!query.trim() || disabled || isStreaming}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
            query.trim() && !disabled && !isStreaming
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          )}
        >
          <Send size={16} />
          {isStreaming ? 'Streaming...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
