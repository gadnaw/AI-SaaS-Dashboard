'use client'

import { cn } from '@/lib/utils'

interface StreamingIndicatorProps {
  isStreaming?: boolean
  className?: string
}

export function StreamingIndicator({ isStreaming = true, className }: StreamingIndicatorProps) {
  if (!isStreaming) return null

  return (
    <div className={cn('flex items-center gap-1 py-2', className)}>
      <span className="text-xs text-gray-500 mr-2">AI is thinking</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
            style={{
              animationDelay: `${index * 0.15}s`,
              animationDuration: '0.6s',
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Alternative: typewriter cursor animation
export function TypewriterCursor({ isTyping = true }: { isTyping?: boolean }) {
  return (
    <span
      className={cn(
        'inline-block w-2 h-5 bg-blue-500 ml-1 align-middle',
        isTyping ? 'animate-pulse' : 'opacity-0'
      )}
    />
  )
}
