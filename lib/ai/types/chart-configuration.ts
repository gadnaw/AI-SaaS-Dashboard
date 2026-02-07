export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'scatter'

export interface AxisConfig {
  dataKey: string
  label?: string
  tick?: boolean
  tickFormatter?: (value: number | string) => string
}

export interface SeriesConfig {
  dataKey: string
  name: string
  color: string
  type?: 'monotone' | 'step' | 'linear'
  strokeWidth?: number
  fillOpacity?: number
}

export interface TooltipConfig {
  enabled: boolean
  formatter?: (value: number | string, name: string) => string
  labelFormatter?: (label: string) => string
}

export interface LegendConfig {
  position: 'top' | 'bottom' | 'left' | 'right'
  align?: 'left' | 'center' | 'right'
}

export interface GridConfig {
  show: boolean
  stroke: string
  strokeDasharray?: string
}

export interface ChartConfiguration {
  type: ChartType
  title: string
  data: Array<Record<string, unknown>>
  xAxis: AxisConfig
  yAxis: AxisConfig[]
  series: SeriesConfig[]
  tooltip?: TooltipConfig
  legend?: LegendConfig
  grid?: GridConfig
  colors: string[]
  animation?: boolean
  responsive?: boolean
}

export const CHART_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#84CC16', // lime-500
  '#F97316', // orange-500
  '#6366F1', // indigo-500
]

export const PIE_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
  '#F97316',
  '#6366F1',
]

export function createAxisConfig(
  dataKey: string,
  options?: Partial<AxisConfig>
): AxisConfig {
  return {
    dataKey,
    tick: true,
    ...options,
  }
}

export function createSeriesConfig(
  dataKey: string,
  name: string,
  color: string,
  options?: Partial<SeriesConfig>
): SeriesConfig {
  return {
    dataKey,
    name,
    color,
    type: 'monotone',
    strokeWidth: 2,
    fillOpacity: 0.3,
    ...options,
  }
}

export function createTooltipConfig(
  enabled: boolean = true
): TooltipConfig {
  return {
    enabled,
    formatter: (value: number | string) => String(value),
    labelFormatter: (label: string) => label,
  }
}

export function createLegendConfig(
  position: LegendConfig['position'] = 'top'
): LegendConfig {
  return {
    position,
    align: 'center',
  }
}

export function createGridConfig(
  show: boolean = true
): GridConfig {
  return {
    show,
    stroke: '#E5E7EB',
    strokeDasharray: '3 3',
  }
}

export function generateChartColors(count: number): string[] {
  if (count <= CHART_COLORS.length) {
    return CHART_COLORS.slice(0, count)
  }
  
  const colors: string[] = []
  for (let i = 0; i < count; i++) {
    colors.push(CHART_COLORS[i % CHART_COLORS.length])
  }
  return colors
}

export function assignColorsToSeries(
  series: SeriesConfig[],
  colors?: string[]
): SeriesConfig[] {
  const palette = colors || generateChartColors(series.length)
  
  return series.map((s, index) => ({
    ...s,
    color: s.color || palette[index % palette.length],
  }))
}

export function inferChartType(
  data: Array<Record<string, unknown>>,
  xAxisField: string,
  yAxisFields: string[]
): ChartType {
  if (yAxisFields.length > 3) {
    return 'bar'
  }
  
  const isTimeSeries = data.some((row, index) => {
    if (index === 0) return false
    const prevDate = new Date(row[xAxisField] as string)
    const currDate = new Date(row[xAxisField] as string)
    return prevDate instanceof Date && !isNaN(prevDate.getTime()) &&
           currDate instanceof Date && !isNaN(currDate.getTime())
  })
  
  if (isTimeSeries) {
    return yAxisFields.length > 1 ? 'line' : 'area'
  }
  
  if (yAxisFields.length === 2) {
    return 'scatter'
  }
  
  return 'bar'
}

export function detectNumericFields(
  data: Array<Record<string, unknown>>
): string[] {
  if (data.length === 0) return []
  
  const numericFields: string[] = []
  const sampleRow = data[0]
  
  for (const key of Object.keys(sampleRow)) {
    const isNumeric = data.every(row => {
      const value = row[key]
      return typeof value === 'number' || value === null || value === undefined
    })
    if (isNumeric) {
      numericFields.push(key)
    }
  }
  
  return numericFields
}

export function detectCategoricalFields(
  data: Array<Record<string, unknown>>
): string[] {
  if (data.length === 0) return []
  
  const categoricalFields: string[] = []
  const sampleRow = data[0]
  
  for (const key of Object.keys(sampleRow)) {
    const uniqueValues = new Set(data.map(row => String(row[key])))
    if (uniqueValues.size <= 10) {
      categoricalFields.push(key)
    }
  }
  
  return categoricalFields
}

export function transformDataForChart(
  data: Array<Record<string, unknown>>,
  xAxisField: string,
  yAxisFields: string[]
): Array<Record<string, unknown>> {
  return data.map(row => {
    const newRow: Record<string, unknown> = { [xAxisField]: row[xAxisField] }
    
    for (const yField of yAxisFields) {
      newRow[yField] = row[yField]
    }
    
    return newRow
  })
}

export function createDefaultChartConfiguration(
  type: ChartType,
  title: string,
  data: Array<Record<string, unknown>>,
  xAxisField: string,
  yAxisFields: string[],
  options?: Partial<ChartConfiguration>
): ChartConfiguration {
  const colors = generateChartColors(yAxisFields.length)
  
  const xAxis = createAxisConfig(xAxisField, {
    label: xAxisField,
  })
  
  const yAxis = yAxisFields.map((field, index) =>
    createAxisConfig(field, {
      label: field,
    })
  )
  
  const series = yAxisFields.map((field, index) =>
    createSeriesConfig(field, field, colors[index])
  )
  
  return {
    type,
    title,
    data: transformDataForChart(data, xAxisField, yAxisFields),
    xAxis,
    yAxis,
    series: assignColorsToSeries(series),
    tooltip: createTooltipConfig(),
    legend: createLegendConfig(),
    grid: createGridConfig(),
    colors,
    animation: true,
    responsive: true,
    ...options,
  }
}

export function createBarChartConfig(
  title: string,
  data: Array<Record<string, unknown>>,
  xAxisField: string,
  yAxisFields: string[],
  options?: Partial<ChartConfiguration>
): ChartConfiguration {
  return createDefaultChartConfiguration('bar', title, data, xAxisField, yAxisFields, options)
}

export function createLineChartConfig(
  title: string,
  data: Array<Record<string, unknown>>,
  xAxisField: string,
  yAxisFields: string[],
  options?: Partial<ChartConfiguration>
): ChartConfiguration {
  const config = createDefaultChartConfiguration('line', title, data, xAxisField, yAxisFields, options)
  config.series = config.series.map(s => ({ ...s, fillOpacity: 0 }))
  return config
}

export function createAreaChartConfig(
  title: string,
  data: Array<Record<string, unknown>>,
  xAxisField: string,
  yAxisFields: string[],
  options?: Partial<ChartConfiguration>
): ChartConfiguration {
  const config = createDefaultChartConfiguration('area', title, data, xAxisField, yAxisFields, options)
  return config
}

export function createPieChartConfig(
  title: string,
  data: Array<Record<string, unknown>>,
  nameField: string,
  valueField: string,
  options?: Partial<ChartConfiguration>
): ChartConfiguration {
  const pieData = data.map(row => ({
    name: String(row[nameField]),
    value: row[valueField] as number,
  }))
  
  const colors = PIE_COLORS.slice(0, pieData.length)
  
  return {
    type: 'pie',
    title,
    data: pieData as unknown as Array<Record<string, unknown>>,
    xAxis: createAxisConfig('name'),
    yAxis: [createAxisConfig('value')],
    series: pieData.map((slice, index) =>
      createSeriesConfig(slice.name, slice.name, colors[index % colors.length])
    ),
    tooltip: createTooltipConfig(),
    legend: createLegendConfig('right'),
    grid: { show: false, stroke: '' },
    colors,
    animation: true,
    responsive: true,
    ...options,
  }
}

export function createScatterChartConfig(
  title: string,
  data: Array<Record<string, unknown>>,
  xAxisField: string,
  yAxisFields: string[],
  options?: Partial<ChartConfiguration>
): ChartConfiguration {
  return createDefaultChartConfiguration('scatter', title, data, xAxisField, yAxisFields, options)
}
