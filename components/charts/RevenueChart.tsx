'use client'

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  TooltipProps,
} from 'recharts'
import { cn } from '@/lib/utils'

export interface RevenueDataPoint {
  date: string
  revenue: number
  previousPeriod?: number
}

export interface RevenueChartProps {
  data: RevenueDataPoint[]
  className?: string
  showPreviousPeriod?: boolean
  height?: number
}

interface CustomTooltipProps extends TooltipProps<number, string> {
  active?: boolean
  payload?: any[]
  label?: string
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)

  return (
    <div className="rounded-lg border bg-background p-3 shadow-lg">
      <p className="text-sm font-medium">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="mt-1 flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <p className="text-sm text-muted-foreground">
            {entry.name}:{' '}
            <span className="font-medium text-foreground">
              {formatCurrency(entry.value as number)}
            </span>
          </p>
        </div>
      ))}
    </div>
  )
}

export function RevenueChart({
  data,
  className,
  showPreviousPeriod = false,
  height = 300,
}: RevenueChartProps) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 0,
          }}
        >
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(221.2, 83.2%, 53.3%)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(221.2, 83.2%, 53.3%)" stopOpacity={0} />
            </linearGradient>
            {showPreviousPeriod && (
              <linearGradient id="colorPrevious" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(215.4, 16.3%, 46.9%)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="hsl(215.4, 16.3%, 46.9%)" stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            tickLine={false}
          />
          <YAxis
            className="text-xs"
            tick={{ fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) =>
              new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              }).format(value)
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="hsl(221.2, 83.2%, 53.3%)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRevenue)"
            name="Revenue"
          />
          {showPreviousPeriod && (
            <Area
              type="monotone"
              dataKey="previousPeriod"
              stroke="hsl(215.4, 16.3%, 46.9%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              fillOpacity={1}
              fill="url(#colorPrevious)"
              name="Previous Period"
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
