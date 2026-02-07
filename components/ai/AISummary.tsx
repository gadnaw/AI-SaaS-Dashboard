'use client'

import { useState } from 'react'
import { Sparkles, Copy, Check, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StreamingIndicator } from './StreamingIndicator'

interface AISummaryProps {
  summary: string
  isStreaming?: boolean
  className?: string
}

function SummaryContent({ text, isStreaming }: { text: string; isStreaming: boolean }) {
  // Simple paragraph formatting
  const paragraphs = text.split('\n\n')

  return (
    <div className="space-y-3">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className={cn(
            'text-gray-700 leading-relaxed',
            isStreaming && index === paragraphs.length - 1 && 'animate-pulse'
          )}
        >
          {paragraph}
        </p>
      ))}
    </div>
  )
}

export function AISummary({
  summary,
  isStreaming = false,
  className,
}: AISummaryProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summary)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={cn(
        'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-6',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-blue-600" />
          <h3 className="font-semibold text-gray-900">AI Summary</h3>
        </div>

        <button
          onClick={handleCopy}
          className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors',
            copied
              ? 'bg-green-100 text-green-700'
              : 'text-gray-500 hover:bg-white hover:text-gray-700'
          )}
        >
          {copied ? (
            <>
              <Check size={14} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Summary content */}
      <div className="relative">
        <div className="flex items-start gap-2">
          <FileText size={16} className="text-blue-400 mt-1 flex-shrink-0" />
          <SummaryContent text={summary} isStreaming={isStreaming} />
        </div>

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="ml-6 mt-2">
            <StreamingIndicator isStreaming={isStreaming} />
          </div>
        )}
      </div>
    </div>
  )
}
