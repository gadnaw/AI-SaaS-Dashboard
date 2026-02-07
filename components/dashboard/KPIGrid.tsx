import { cn } from '@/lib/utils'
import { MetricCard, MetricCardProps } from './MetricCard'

export interface KPIGridProps {
  metrics: MetricCardProps[]
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function KPIGrid({ metrics, columns = 4, className }: KPIGridProps) {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  )
}
