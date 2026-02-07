'use client'

import { cn } from '@/lib/utils'
import { Loader2, AlertCircle } from 'lucide-react'

export interface ChartContainerProps {
  title: string
  description?: string
  children: React.ReactNode
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyMessage?: string
  className?: string
  action?: React.ReactNode
}

export function ChartContainer({
  title,
  description,
  children,
  loading,
  error,
  empty,
  emptyMessage = 'No data available',
  className,
  action,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>

      <div className="mt-4 h-[300px] w-full">
        {loading && (
          <div className="flex h-full w-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          </div>
        )}

        {empty && !loading && !error && (
          <div className="flex h-full w-full items-center justify-center">
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        )}

        {!loading && !error && !empty && children}
      </div>
    </div>
  )
}
