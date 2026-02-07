export interface TimeSeriesDataPoint {
  timestamp: string // ISO 8601 format for cross-phase consistency
  value: number
}

export interface MetricDataPoint {
  metricName: string
  currentValue: number
  mean: number
  standardDeviation: number
  zScore: number
  timestamp: string
}

export interface ChartDataPoint {
  label: string
  value: number
  secondaryValue?: number
  color?: string
}

export interface PieChartData {
  label: string
  value: number
  percentage: number
  color?: string
}

export interface TrendData {
  direction: 'up' | 'down' | 'stable'
  percentage: number
  currentValue: number
  previousValue: number
}

export interface AnomalyDataPoint extends TimeSeriesDataPoint {
  expectedValue: number
  deviation: number
  severity: 'low' | 'medium' | 'high'
  description?: string
}
