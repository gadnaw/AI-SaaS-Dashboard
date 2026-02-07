'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

export interface MetricCardProps {
  title: string
  value: number
  format?: 'number' | 'currency' | 'percent'
  trend?: number
  trendLabel?: string
  sparklineData?: { value: number }[]
  className?: string
}

interface SparklineProps {
  data: { value: number }[]
  width?: number
  height?: number
  trend: number
  className?: string
}

function Sparkline({ data, width = 100, height = 30, trend, className }: SparklineProps) {
  const min = Math.min(...data.map(d => d.value))
  const max = Math.max(...data.map(d => d.value))
  const range = max - min || 1

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d.value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  const strokeColor = trend > 0 ? 'hsl(142.1, 76.2%, 36.3%)' : trend < 0 ? 'hsl(0, 84.2%, 60.2%)' : 'hsl(215.4, 16.3%, 46.9%)'

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      viewBox={`0 0 ${width} ${height}`}
    >
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

interface AnimatedCounterProps {
  value: number
  format: 'number' | 'currency' | 'percent'
  duration?: number
}

function AnimatedCounter({ value, format, duration = 1000 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const startTimeRef = useRef<number | null>(null)
  const animationRef = useRef<number | null>(null)

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4)
      const currentValue = Math.floor(easeOutQuart * value)

      setDisplayValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setDisplayValue(value)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [value, duration])

  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val)
      case 'percent':
        return `${val}%`
      case 'number':
      default:
        return new Intl.NumberFormat('en-US').format(val)
    }
  }

  return <span>{formatValue(displayValue)}</span>
}

export function MetricCard({
  title,
  value,
  format = 'number',
  trend,
  trendLabel,
  sparklineData,
  className,
}: MetricCardProps) {
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus
  const trendColor = trend && trend > 0 ? 'text-green-600' : trend && trend < 0 ? 'text-red-600' : 'text-gray-500'
  const trendBg = trend && trend > 0 ? 'bg-green-50' : trend && trend < 0 ? 'bg-red-50' : 'bg-gray-50'

  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {trend !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
              trendColor,
              trendBg
            )}
          >
            <TrendIcon className="h-3 w-3" />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <AnimatedCounter value={value} format={format} />
      </div>

      {trendLabel && (
        <p className="mt-1 text-xs text-muted-foreground">{trendLabel}</p>
      )}

      {sparklineData && sparklineData.length > 1 && (
        <div className="mt-4 h-[30px] w-full">
          <Sparkline
            data={sparklineData}
            width={200}
            height={30}
            trend={trend || 0}
            className="w-full"
          />
        </div>
      )}
    </div>
  )
}
