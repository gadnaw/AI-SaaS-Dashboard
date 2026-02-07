import {
  SummarizeDataParams,
  type QueryResult,
} from '@/ai/types/query-result'

interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable'
  percentage: number
  period: string
}

interface ComparisonResult {
  current: number
  previous: number | null
  difference: number
  percentageChange: number
  verdict: 'increase' | 'decrease' | 'no_change'
}

interface AnomalyDetection {
  isAnomaly: boolean
  value: number
  expectedRange: { min: number; max: number }
  deviation: number
  description: string
}

interface DataInsights {
  total: number
  average: number
  min: number
  max: number
  median?: number
  standardDeviation?: number
}

function analyzeTrend(
  data: Array<Record<string, unknown>>,
  valueField: string,
  timeField?: string
): TrendAnalysis {
  if (data.length < 2) {
    return { direction: 'stable', percentage: 0, period: 'insufficient data' }
  }
  
  const sortedData = timeField
    ? [...data].sort((a, b) => {
        const timeA = new Date(a[timeField] as string).getTime()
        const timeB = new Date(b[timeField] as string).getTime()
        return timeA - timeB
      })
    : data
  
  const firstValue = Number(sortedData[0][valueField]) || 0
  const lastValue = Number(sortedData[sortedData.length - 1][valueField]) || 0
  
  if (firstValue === 0) {
    return { direction: lastValue > 0 ? 'up' : 'stable', percentage: 0, period: 'period' }
  }
  
  const change = ((lastValue - firstValue) / Math.abs(firstValue)) * 100
  const absChange = Math.abs(change)
  
  let direction: 'up' | 'down' | 'stable'
  if (absChange < 5) {
    direction = 'stable'
  } else if (change > 0) {
    direction = 'up'
  } else {
    direction = 'down'
  }
  
  return {
    direction,
    percentage: absChange,
    period: `from ${sortedData.length} data points`,
  }
}

function comparePeriods(
  current: Array<Record<string, unknown>>,
  previous: Array<Record<string, unknown>> | null,
  valueField: string
): ComparisonResult {
  const currentSum = current.reduce((sum, row) => sum + (Number(row[valueField]) || 0), 0)
  const currentAvg = currentSum / current.length
  
  if (!previous || previous.length === 0) {
    return {
      current: currentSum,
      previous: null,
      difference: 0,
      percentageChange: 0,
      verdict: 'no_change',
    }
  }
  
  const previousSum = previous.reduce((sum, row) => sum + (Number(row[valueField]) || 0), 0)
  const previousAvg = previousSum / previous.length
  
  const diff = currentSum - previousSum
  const pctChange = previousSum !== 0 ? (diff / previousSum) * 100 : 0
  
  let verdict: 'increase' | 'decrease' | 'no_change'
  if (Math.abs(pctChange) < 5) {
    verdict = 'no_change'
  } else if (pctChange > 0) {
    verdict = 'increase'
  } else {
    verdict = 'decrease'
  }
  
  return {
    current: currentSum,
    previous: previousSum,
    difference: diff,
    percentageChange: pctChange,
    verdict,
  }
}

function detectAnomalies(
  data: Array<Record<string, unknown>>,
  valueField: string
): AnomalyDetection[] {
  const values = data.map(row => Number(row[valueField])).filter(v => !isNaN(v))
  
  if (values.length < 3) {
    return []
  }
  
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
  
  const anomalies: AnomalyDetection[] = []
  const threshold = 2
  
  data.forEach((row, index) => {
    const value = Number(row[valueField])
    if (isNaN(value)) return
    
    const zScore = stdDev > 0 ? Math.abs((value - mean) / stdDev) : 0
    
    if (zScore > threshold) {
      anomalies.push({
        isAnomaly: true,
        value,
        expectedRange: { min: mean - threshold * stdDev, max: mean + threshold * stdDev },
        deviation: zScore,
        description: `Value ${value.toLocaleString()} is ${zScore.toFixed(1)} standard deviations from the mean`,
      })
    }
  })
  
  return anomalies
}

function calculateInsights(
  data: Array<Record<string, unknown>>,
  valueField: string
): DataInsights {
  const values = data.map(row => Number(row[valueField])).filter(v => !isNaN(v))
  
  if (values.length === 0) {
    return { total: 0, average: 0, min: 0, max: 0 }
  }
  
  const sorted = [...values].sort((a, b) => a - b)
  const total = values.reduce((a, b) => a + b, 0)
  const avg = total / values.length
  
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)]
  
  const squaredDiffs = values.map(v => Math.pow(v - avg, 2))
  const stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length)
  
  return {
    total,
    average: avg,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median,
    standardDeviation: stdDev,
  }
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`
  }
  return value.toFixed(2)
}

function generateTrendSummary(
  trend: TrendAnalysis,
  focusAreas: string[],
  tone: 'neutral' | 'insightful' | 'actionable'
): string {
  const { direction, percentage, period } = trend
  
  let summary = ''
  
  switch (tone) {
    case 'actionable':
      if (direction === 'up') {
        summary = `Great progress! The metric showed a ${percentage.toFixed(1)}% ${direction}ward trend over ${period}. `
        summary += 'Consider capitalizing on this momentum by analyzing what drove the increase.'
      } else if (direction === 'down') {
        summary = `Attention needed: The metric declined by ${percentage.toFixed(1)}% over ${period}. `
        summary += 'Investigate the factors contributing to this decrease and develop a recovery plan.'
      } else {
        summary = `The metric has remained stable over ${period}. `
        summary += 'Look for opportunities to identify growth areas or optimize current processes.'
      }
      break
    
    case 'insightful':
      if (direction === 'up') {
        summary = `Analysis reveals a positive ${percentage.toFixed(1)}% upward trend across ${period}. `
        summary += 'This growth pattern suggests effective strategies or favorable market conditions.'
      } else if (direction === 'down') {
        summary = `A concerning ${percentage.toFixed(1)}% downward trend emerges over ${period}. `
        summary += 'Understanding the drivers behind this decline could reveal important insights.'
      } else {
        summary = `The data shows stability with minimal fluctuation over ${period}. `
        summary += 'This consistency may indicate a mature or plateaued state.'
      }
      break
    
    case 'neutral':
    default:
      summary = `Trend analysis shows a ${direction === 'stable' ? 'stable' : `${direction}ward`} movement of ${percentage.toFixed(1)}% over ${period}.`
      break
  }
  
  if (focusAreas.length > 0) {
    summary += ` Key focus areas include: ${focusAreas.join(', ')}.`
  }
  
  return summary
}

function generateComparisonSummary(
  comparison: ComparisonResult,
  focusAreas: string[],
  tone: 'neutral' | 'insightful' | 'actionable'
): string {
  const { current, previous, difference, percentageChange, verdict } = comparison
  
  let summary = ''
  
  switch (tone) {
    case 'actionable':
      if (verdict === 'increase') {
        summary = `Excellent! Current period shows ${formatNumber(current)} compared to ${formatNumber(previous || 0)} previously — a ${Math.abs(percentageChange).toFixed(1)}% increase. `
        summary += 'Identify the successful factors and replicate them going forward.'
      } else if (verdict === 'decrease') {
        summary = `Alert: Current period totals ${formatNumber(current)} versus ${formatNumber(previous || 0)} — a ${Math.abs(percentageChange).toFixed(1)}% decrease. `
        summary += 'Immediate review recommended to understand and reverse this trend.'
      } else {
        summary = `Results are consistent at ${formatNumber(current)} (previously ${formatNumber(previous || 0)}). `
        summary += 'Maintain current practices while seeking incremental improvements.'
      }
      break
    
    case 'insightful':
      if (verdict === 'increase') {
        summary = `Comparative analysis reveals a ${Math.abs(percentageChange).toFixed(1)}% improvement from ${formatNumber(previous || 0)} to ${formatNumber(current)}. `
        summary += 'This suggests effective implementation of strategies or favorable conditions.'
      } else if (verdict === 'decrease') {
        summary = `A ${Math.abs(percentageChange).toFixed(1)}% decline is observed, dropping from ${formatNumber(previous || 0)} to ${formatNumber(current)}. `
        summary += 'Root cause analysis would help identify factors contributing to this change.'
      } else {
        summary = `Performance remains consistent with ${formatNumber(current)} in both periods. `
        summary += 'Current approaches are stable but may benefit from optimization efforts.'
      }
      break
    
    case 'neutral':
    default:
      summary = `Period comparison: ${formatNumber(current)} (current) vs ${formatNumber(previous || 0)} (previous), representing a ${Math.abs(percentageChange).toFixed(1)}% ${verdict === 'increase' ? 'increase' : verdict === 'decrease' ? 'decrease' : 'no change'}.`
      break
  }
  
  if (focusAreas.length > 0) {
    summary += ` Focus areas: ${focusAreas.join(', ')}.`
  }
  
  return summary
}

function generateAnomalySummary(
  anomalies: AnomalyDetection[],
  tone: 'neutral' | 'insightful' | 'actionable'
): string {
  if (anomalies.length === 0) {
    return 'No significant anomalies detected in the data. All values fall within expected ranges.'
  }
  
  let summary = ''
  
  switch (tone) {
    case 'actionable':
      summary = `CRITICAL: ${anomalies.length} significant anomaly(ies) detected requiring immediate attention:\\n\\n`
      anomalies.forEach((a, i) => {
        summary += `${i + 1}. Value of ${formatNumber(a.value)} detected — ${a.description}\\n`
        summary += `   Expected range: ${formatNumber(a.expectedRange.min)} - ${formatNumber(a.expectedRange.max)}\\n`
        summary += `   Recommended action: Investigate the cause of this deviation.\\n\\n`
      })
      break
    
    case 'insightful':
      summary = `Analysis identified ${anomalies.length} notable outlier(s) in the dataset:\\n\\n`
      anomalies.forEach((a, i) => {
        summary += `${i + 1}. ${a.description}\\n`
        summary += `   This value (${formatNumber(a.value)}) falls outside the typical range of ${formatNumber(a.expectedRange.min)} - ${formatNumber(a.expectedRange.max)}.\\n\\n`
      })
      summary += 'These anomalies may indicate unusual events, data quality issues, or significant changes in underlying patterns.'
      break
    
    case 'neutral':
    default:
      summary = `${anomalies.length} data point(s) were identified as statistical outliers:\\n\\n`
      anomalies.forEach((a, i) => {
        summary += `${i + 1}. Value: ${formatNumber(a.value)}, ${a.description}\\n`
      })
      summary += '\\nThese values fall outside the expected range based on statistical analysis.'
      break
  }
  
  return summary
}

function generateSummarySummary(
  insights: DataInsights,
  focusAreas: string[],
  tone: 'neutral' | 'insightful' | 'actionable'
): string {
  const { total, average, min, max, median, standardDeviation } = insights
  
  let summary = ''
  
  switch (tone) {
    case 'actionable':
      summary = `Key metrics overview:\\n`
      summary += `- Total: ${formatNumber(total)}\\n`
      summary += `- Average: ${formatNumber(average)}\\n`
      summary += `- Range: ${formatNumber(min)} - ${formatNumber(max)}\\n`
      if (median !== undefined) summary += `- Median: ${formatNumber(median)}\\n`
      if (standardDeviation !== undefined) summary += `- Variability: ${formatNumber(standardDeviation)}\\n\\n`
      
      summary += 'Action items:\\n'
      if (standardDeviation && standardDeviation > average * 0.5) {
        summary += '- High variability detected — investigate factors causing fluctuation.\\n'
      }
      if (focusAreas.length > 0) {
        summary += `- Review: ${focusAreas.join(', ')}\\n`
      }
      break
    
    case 'insightful':
      summary = `Statistical summary of the dataset:\\n\\n`
      summary += `The dataset contains ${formatNumber(total)} in total value, with an average of ${formatNumber(average)} per entry. `
      summary += `Values range from ${formatNumber(min)} to ${formatNumber(max)}, with a median of ${formatNumber(median || average)}.\\n\\n`
      if (standardDeviation !== undefined) {
        const cv = (standardDeviation / average) * 100
        summary += `Coefficient of variation is ${cv.toFixed(1)}%, indicating ${cv < 20 ? 'low' : cv < 50 ? 'moderate' : 'high'} variability in the data.\\n`
      }
      break
    
    case 'neutral':
    default:
      summary = `Summary statistics:\\n`
      summary += `- Total: ${formatNumber(total)}\\n`
      summary += `- Average: ${formatNumber(average)}\\n`
      summary += `- Minimum: ${formatNumber(min)}\\n`
      summary += `- Maximum: ${formatNumber(max)}\\n`
      if (median !== undefined) summary += `- Median: ${formatNumber(median)}\\n`
      if (standardDeviation !== undefined) summary += `- Standard Deviation: ${formatNumber(standardDeviation)}\\n`
      break
  }
  
  return summary
}

export async function summarizeData(
  params: SummarizeDataParams,
  queryResult: QueryResult<unknown>
): Promise<string> {
  const { summaryType, focusAreas, tone = 'neutral' } = params
  const { data } = queryResult
  
  if (!data || data.length === 0) {
    return 'No data available to generate a summary.'
  }
  
  const numericFields = Object.keys(data[0]).filter(key =>
    data.every(row => typeof row[key] === 'number' || row[key] === null)
  )
  
  if (numericFields.length === 0) {
    return 'Unable to generate numerical summary — no numeric fields detected in the data.'
  }
  
  const primaryValueField = focusAreas?.length
    ? focusAreas[0]
    : numericFields[0]
  
  const timeFields = Object.keys(data[0]).filter(key => {
    try {
      new Date(data[0][key] as string)
      return true
    } catch {
      return false
    }
  })
  
  let summary = ''
  
  switch (summaryType) {
    case 'trend':
      const trend = analyzeTrend(data, primaryValueField, timeFields[0])
      summary = generateTrendSummary(trend, focusAreas || [], tone)
      break
    
    case 'comparison':
      const midpoint = Math.floor(data.length / 2)
      const currentPeriod = data.slice(midpoint)
      const previousPeriod = data.slice(0, midpoint)
      const comparison = comparePeriods(currentPeriod, previousPeriod, primaryValueField)
      summary = generateComparisonSummary(comparison, focusAreas || [], tone)
      break
    
    case 'anomaly':
      const anomalies = detectAnomalies(data, primaryValueField)
      summary = generateAnomalySummary(anomalies, tone)
      break
    
    case 'summary':
    default:
      const insights = calculateInsights(data, primaryValueField)
      summary = generateSummarySummary(insights, focusAreas || [], tone)
      break
  }
  
  return summary
}
