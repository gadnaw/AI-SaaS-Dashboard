'use client'

import { Sparkles, TrendingUp, Users, DollarSign, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuerySuggestionsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
  className?: string
}

// Default suggestions based on common analytics queries
const defaultSuggestions = [
  { icon: TrendingUp, label: 'Revenue trends', query: 'Show me revenue trends for the last quarter' },
  { icon: Users, label: 'Customer growth', query: 'How many new customers did we acquire this month?' },
  { icon: DollarSign, label: 'Sales analysis', query: 'What are the top selling products?' },
  { icon: BarChart3, label: 'Churn rate', query: 'What is our current churn rate?' },
]

interface SuggestionItem {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  query: string
}

export function QuerySuggestions({
  suggestions,
  onSelect,
  className,
}: QuerySuggestionsProps) {
  // Use provided suggestions or defaults
  const displaySuggestions = suggestions.length > 0
    ? suggestions.map((query, index) => ({
        icon: Sparkles,
        label: `Suggestion ${index + 1}`,
        query,
      }))
    : defaultSuggestions

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Sparkles size={14} />
        <span>Try asking</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {displaySuggestions.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelect(item.query)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg',
              'hover:bg-blue-100 transition-colors text-sm font-medium',
              'border border-blue-200'
            )}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
