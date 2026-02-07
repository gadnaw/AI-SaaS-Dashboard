/**
 * Anomaly Detection Engine
 * 
 * Implements statistical anomaly detection using:
 * - Z-score detection with 90-day rolling window
 * - Exponential smoothing for trend detection
 * 
 * Designed to run server-side, triggered by new metric data via Edge Functions or cron jobs.
 */

import type {
  Anomaly,
  Alert,
  MetricDataPoint,
  ZScoreConfig,
  ExponentialSmoothingConfig,
  CreateAlertRequest,
  AlertSeverity,
} from './types';

// Default configurations
const DEFAULT_ZSCORE_CONFIG: ZScoreConfig = {
  threshold: 2.0,              // Flag z-score > 2 or < -2
  window_size_days: 90,        // 90-day rolling window
  min_data_points: 30,        // Minimum 30 data points for reliable detection
};

const DEFAULT_SMOOTHING_CONFIG: ExponentialSmoothingConfig = {
  alpha: 0.3,                  // Smoothing factor
  window_size: 10,             // Last 10 values
  change_threshold: 0.1,      // 10% change flags a trend
};

/**
 * Calculate the mean of an array of numbers
 */
function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}

/**
 * Calculate standard deviation
 */
function calculateStdDev(values: number[], mean: number): number {
  if (values.length === 0) return 0;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
  return Math.sqrt(avgSquaredDiff);
}

/**
 * Calculate Z-score for a value given baseline statistics
 */
export function calculateZScore(
  currentValue: number,
  baselineMean: number,
  baselineStdDev: number
): number {
  if (baselineStdDev === 0) {
    // No variance - if value differs from mean, it's an anomaly
    return currentValue !== baselineMean ? Infinity : 0;
  }
  return (currentValue - baselineMean) / baselineStdDev;
}

/**
 * Apply exponential smoothing to a series of values
 */
export function exponentialSmoothing(
  values: number[],
  alpha: number = 0.3
): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [...values];

  const smoothed: number[] = [values[0]];
  
  for (let i = 1; i < values.length; i++) {
    const smoothedValue = alpha * values[i] + (1 - alpha) * smoothed[i - 1];
    smoothed.push(smoothedValue);
  }
  
  return smoothed;
}

/**
 * Detect significant trend changes using exponential smoothing
 */
export function detectTrendChange(
  currentValue: number,
  smoothedValues: number[],
  threshold: number = 0.1
): boolean {
  if (smoothedValues.length === 0) return false;
  
  const lastSmoothed = smoothedValues[smoothedValues.length - 1];
  if (lastSmoothed === 0) return currentValue !== 0;
  
  const percentageChange = Math.abs((currentValue - lastSmoothed) / lastSmoothed);
  return percentageChange > threshold;
}

/**
 * Determine severity based on z-score magnitude
 */
export function calculateSeverity(zScore: number, threshold: number): AlertSeverity {
  const absZScore = Math.abs(zScore);
  
  if (absZScore > threshold * 2) {
    return 'critical';
  } else if (absZScore > threshold * 1.5) {
    return 'warning';
  } else {
    return 'info';
  }
}

/**
 * Anomaly Detection Engine Class
 */
export class AnomalyDetectionEngine {
  private zScoreConfig: ZScoreConfig;
  private smoothingConfig: ExponentialSmoothingConfig;

  constructor(
    zScoreConfig: Partial<ZScoreConfig> = {},
    smoothingConfig: Partial<ExponentialSmoothingConfig> = {}
  ) {
    this.zScoreConfig = { ...DEFAULT_ZSCORE_CONFIG, ...zScoreConfig };
    this.smoothingConfig = { ...DEFAULT_SMOOTHING_CONFIG, ...smoothingConfig };
  }

  /**
   * Detect anomalies in a metric given historical data
   */
  detectAnomalies(
    tenantId: string,
    metricName: string,
    currentValue: number,
    historicalData: MetricDataPoint[],
    currentTimestamp: Date = new Date()
  ): Anomaly[] {
    const anomalies: Anomaly[] = [];

    // Filter to rolling window
    const windowStart = new Date(currentTimestamp);
    windowStart.setDate(windowStart.getDate() - this.zScoreConfig.window_size_days);
    
    const windowedData = historicalData.filter(
      (dp) => dp.timestamp >= windowStart && dp.timestamp <= currentTimestamp
    );

    // Need minimum data points for statistical significance
    if (windowedData.length < this.zScoreConfig.min_data_points) {
      return anomalies; // Return empty - not enough data
    }

    const values = windowedData.map((dp) => dp.value);
    const mean = calculateMean(values);
    const stdDev = calculateStdDev(values, mean);
    const zScore = calculateZScore(currentValue, mean, stdDev);

    // Check if this is an anomaly based on z-score threshold
    if (Math.abs(zScore) > this.zScoreConfig.threshold) {
      const anomaly: Anomaly = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        metric_name: metricName,
        detected_at: currentTimestamp,
        current_value: currentValue,
        baseline_mean: mean,
        baseline_std_dev: stdDev,
        z_score: zScore,
        detection_method: 'z_score',
        window_size_days: this.zScoreConfig.window_size_days,
        is_significant: true,
        severity: calculateSeverity(zScore, this.zScoreConfig.threshold),
        data_points: windowedData,
      };

      anomalies.push(anomaly);
    }

    // Also check for trend changes using exponential smoothing
    const historicalValues = historicalData.map((dp) => dp.value);
    const smoothedValues = exponentialSmoothing(
      historicalValues.slice(-this.smoothingConfig.window_size),
      this.smoothingConfig.alpha
    );

    if (detectTrendChange(currentValue, smoothedValues, this.smoothingConfig.change_threshold)) {
      // Create a trend anomaly
      const trendAnomaly: Anomaly = {
        id: crypto.randomUUID(),
        tenant_id: tenantId,
        metric_name: metricName,
        detected_at: currentTimestamp,
        current_value: currentValue,
        baseline_mean: smoothedValues[smoothedValues.length - 1] || mean,
        baseline_std_dev: stdDev,
        z_score: 0,
        detection_method: 'exponential_smoothing',
        window_size_days: this.smoothingConfig.window_size,
        is_significant: true,
        severity: 'info', // Trend changes are typically less severe
        data_points: windowedData,
      };

      anomalies.push(trendAnomaly);
    }

    return anomalies;
  }

  /**
   * Generate an alert from an anomaly
   */
  createAlertFromAnomaly(
    anomaly: Anomaly,
    userId?: string
  ): CreateAlertRequest {
    const direction = anomaly.z_score > 0 ? 'spike' : 'drop';
    const percentageChange = anomaly.baseline_mean !== 0
      ? ((anomaly.current_value - anomaly.baseline_mean) / Math.abs(anomaly.baseline_mean)) * 100
      : 0;

    const title = `Unusual ${direction} in ${anomaly.metric_name}`;
    const message = `${anomaly.metric_name} is ${Math.abs(percentageChange).toFixed(1)}% ${direction} compared to the ${anomaly.window_size_days}-day baseline.`;

    return {
      tenant_id: anomaly.tenant_id,
      user_id: userId,
      type: 'anomaly',
      severity: anomaly.severity,
      title,
      message,
      metric_name: anomaly.metric_name,
      metric_value: anomaly.current_value,
      baseline_value: anomaly.baseline_mean,
      z_score: anomaly.z_score,
      metadata: {
        detection_method: anomaly.detection_method,
        baseline_std_dev: anomaly.baseline_std_dev,
        window_size_days: anomaly.window_size_days,
        data_points_count: anomaly.data_points.length,
      },
    };
  }

  /**
   * Get configuration for reporting
   */
  getConfig() {
    return {
      zScore: this.zScoreConfig,
      smoothing: this.smoothingConfig,
    };
  }
}

/**
 * Singleton instance for easy import
 */
export const anomalyDetectionEngine = new AnomalyDetectionEngine();

/**
 * Helper function to create an alert from raw metric data
 */
export async function detectAndCreateAlert(
  tenantId: string,
  metricName: string,
  currentValue: number,
  historicalData: MetricDataPoint[],
  userId?: string
): Promise<CreateAlertRequest | null> {
  const engine = new AnomalyDetectionEngine();
  const anomalies = engine.detectAnomalies(
    tenantId,
    metricName,
    currentValue,
    historicalData
  );

  // Return the most significant anomaly, if any
  if (anomalies.length === 0) {
    return null;
  }

  // Sort by severity (critical > warning > info)
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  const sortedAnomalies = anomalies.sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );

  return engine.createAlertFromAnomaly(sortedAnomalies[0], userId);
}
