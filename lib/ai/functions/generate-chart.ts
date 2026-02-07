import {
  GenerateChartParams,
  type ChartConfiguration,
  type ChartType,
  detectNumericFields,
  detectCategoricalFields,
  inferChartType,
  createBarChartConfig,
  createLineChartConfig,
  createAreaChartConfig,
  createPieChartConfig,
  createScatterChartConfig,
  type QueryResult,
} from '@/ai/types/query-result'
import {
  createDefaultChartConfiguration,
  CHART_COLORS,
  type AxisConfig,
  type SeriesConfig,
} from '@/ai/types/chart-configuration'

function analyzeDataStructure(data: Array<Record<string, unknown>>): {
  numericFields: string[]
  categoricalFields: string[]
  dateFields: string[]
} {
  const numericFields = detectNumericFields(data)
  const categoricalFields = detectCategoricalFields(data)
  
  const dateFields: string[] = []
  for (const row of data.slice(0, 5)) {
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string') {
        const date = new Date(value)
        if (!isNaN(date.getTime())) {
          dateFields.push(key)
          break
        }
      }
    }
  }
  
  return { numericFields, categoricalFields, dateFields }
}

function selectXAxisField(
  data: Array<Record<string, unknown>>,
  requestedXAxis: string,
  dateFields: string[],
  categoricalFields: string[]
): string {
  if (requestedXAxis && data.length > 0 && requestedXAxis in data[0]) {
    return requestedXAxis
  }
  
  if (dateFields.length > 0) {
    return dateFields[0]
  }
  
  if (categoricalFields.length > 0) {
    return categoricalFields[0]
  }
  
  if (data.length > 0) {
    return Object.keys(data[0])[0]
  }
  
  return 'index'
}

function selectYAxisFields(
  data: Array<Record<string, unknown>>,
  requestedYAxis: string[],
  numericFields: string[]
): string[] {
  if (requestedYAxis && requestedYAxis.length > 0) {
    return requestedYAxis
  }
  
  if (numericFields.length > 0) {
    return numericFields.slice(0, 3)
  }
  
  return []
}

function selectChartType(
  requestedType: ChartType | undefined,
  data: Array<Record<string, unknown>>,
  xAxisField: string,
  yAxisFields: string[],
  dateFields: string[]
): ChartType {
  if (requestedType) {
    return requestedType
  }
  
  return inferChartType(data, xAxisField, yAxisFields)
}

function generateChartTitle(
  chartType: ChartType,
  xAxisField: string,
  yAxisFields: string[]
): string {
  const typeName = chartType.charAt(0).toUpperCase() + chartType.slice(1)
  
  if (yAxisFields.length === 1) {
    return `${typeName} of ${yAxisFields[0]} by ${xAxisField}`
  }
  
  return `${typeName} comparing ${yAxisFields.join(', ')} by ${xAxisField}`
}

function selectColors(count: number): string[] {
  return CHART_COLORS.slice(0, count)
}

function transformQueryResultForChart(
  queryResult: QueryResult<unknown>
): Array<Record<string, unknown>> {
  if (!queryResult || !queryResult.data) {
    return []
  }
  
  const { data } = queryResult
  
  if (data.length === 0) {
    return []
  }
  
  return data.map((row, index) => ({
    ...(row as Record<string, unknown>),
    _index: index,
  }))
}

function enrichDataWithCalculations(
  data: Array<Record<string, unknown>>,
  yAxisFields: string[]
): Array<Record<string, unknown>> {
  const enriched = [...data]
  
  for (const yField of yAxisFields) {
    const values = enriched.map(row => row[yField]).filter(v => typeof v === 'number') as number[]
    
    if (values.length > 0) {
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      enriched.forEach((row, index) => {
        if (typeof row[yField] === 'number') {
          enriched[index] = {
            ...row,
            [`${yField}_pct_of_avg`]: avg > 0 ? ((row[yField] as number) / avg * 100).toFixed(2) : '0',
          }
        }
      })
    }
  }
  
  return enriched
}

export async function generateChart(
  params: GenerateChartParams,
  queryResult: QueryResult<unknown>
): Promise<ChartConfiguration> {
  const { chartType: requestedType, dataSource, xAxis: requestedXAxis, yAxis: requestedYAxis, title: requestedTitle, colors: requestedColors } = params
  
  const data = transformQueryResultForChart(queryResult)
  
  if (data.length === 0) {
    return {
      type: requestedType || 'bar',
      title: requestedTitle || 'No Data Available',
      data: [],
      xAxis: { dataKey: requestedXAxis || 'category' },
      yAxis: [],
      series: [],
      colors: [],
      animation: true,
    }
  }
  
  const { numericFields, categoricalFields, dateFields } = analyzeDataStructure(data)
  
  const xAxisField = selectXAxisField(data, requestedXAxis, dateFields, categoricalFields)
  const yAxisFields = selectYAxisFields(data, requestedYAxis, numericFields)
  
  if (yAxisFields.length === 0) {
    return {
      type: requestedType || 'bar',
      title: requestedTitle || 'No Numeric Data Available',
      data,
      xAxis: { dataKey: xAxisField },
      yAxis: [],
      series: [],
      colors: [],
      animation: true,
    }
  }
  
  const chartType = selectChartType(requestedType, data, xAxisField, yAxisFields, dateFields)
  const title = requestedTitle || generateChartTitle(chartType, xAxisField, yAxisFields)
  const colors = selectColors(yAxisFields.length)
  
  let config: ChartConfiguration
  
  const enrichedData = enrichDataForChart(data, xAxisField, yAxisFields)
  
  switch (chartType) {
    case 'line':
      config = createLineChartConfig(title, enrichedData, xAxisField, yAxisFields, { colors })
      break
    
    case 'area':
      config = createAreaChartConfig(title, enrichedData, xAxisField, yAxisFields, { colors })
      break
    
    case 'pie':
      config = createPieChartConfig(
        title,
        enrichedData,
        xAxisField,
        yAxisFields[0],
        { colors }
      )
      break
    
    case 'scatter':
      config = createScatterChartConfig(title, enrichedData, xAxisField, yAxisFields, { colors })
      break
    
    case 'bar':
    default:
      config = createBarChartConfig(title, enrichedData, xAxisField, yAxisFields, { colors })
      break
  }
  
  return {
    ...config,
    tooltip: {
      enabled: true,
      formatter: (value: number | string, name: string) => {
        const formattedValue = typeof value === 'number' ? value.toLocaleString() : String(value)
        return `${name}: ${formattedValue}`
      },
      labelFormatter: (label: string) => label,
    },
    legend: {
      position: 'top',
      align: 'center',
    },
    grid: {
      show: true,
      stroke: '#E5E7EB',
      strokeDasharray: '3 3',
    },
    animation: true,
    responsive: true,
  }
}

function enrichDataForChart(
  data: Array<Record<string, unknown>>,
  xAxisField: string,
  yAxisFields: string[]
): Array<Record<string, unknown>> {
  const enriched = data.map(row => ({ ...row }))
  
  for (const yField of yAxisFields) {
    const values = enriched
      .map(row => row[yField])
      .filter(v => typeof v === 'number') as number[]
    
    if (values.length > 0) {
      const max = Math.max(...values)
      enriched.forEach(row => {
        if (typeof row[yField] === 'number') {
          const normalizedValue = max > 0 ? (row[yField] as number) / max : 0
          enriched[enriched.indexOf(row)] = {
            ...row,
            [`${yField}_normalized`]: normalizedValue.toFixed(3),
          }
        }
      })
    }
  }
  
  return enriched
}

export function suggestChartConfiguration(
  data: Array<Record<string, unknown>>,
  goal: string
): Partial<GenerateChartParams> {
  const { numericFields, categoricalFields, dateFields } = analyzeDataStructure(data)
  
  if (goal.toLowerCase().includes('trend') || goal.toLowerCase().includes('over time')) {
    if (dateFields.length > 0) {
      return {
        chartType: 'line',
        xAxis: dateFields[0],
        yAxis: numericFields.slice(0, 2),
      }
    }
  }
  
  if (goal.toLowerCase().includes('comparison') || goal.toLowerCase().includes('compare')) {
    return {
      chartType: 'bar',
      xAxis: categoricalFields[0] || numericFields[0],
      yAxis: numericFields.slice(0, 3),
    }
  }
  
  if (goal.toLowerCase().includes('distribution') || goal.toLowerCase().includes('breakdown')) {
    return {
      chartType: 'pie',
      xAxis: categoricalFields[0],
      yAxis: [numericFields[0] || 'count'],
    }
  }
  
  if (goal.toLowerCase().includes('correlation') || goal.toLowerCase().includes('relationship')) {
    return {
      chartType: 'scatter',
      xAxis: numericFields[0],
      yAxis: numericFields.slice(1, 3),
    }
  }
  
  return {
    chartType: 'bar',
    xAxis: categoricalFields[0] || dateFields[0] || numericFields[0],
    yAxis: numericFields.slice(0, 2),
  }
}
