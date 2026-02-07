/**
 * Alert Types and Interfaces
 * 
 * Defines the core data structures for the smart alerts system
 * including alerts, anomalies, metrics, and enrichment data.
 */

// Alert severity levels
export type AlertSeverity = 'info' | 'warning' | 'critical';

// Alert types based on detection method
export type AlertType = 'anomaly' | 'threshold' | 'trend' | 'rate_limit';

// Alert status for workflow management
export type AlertStatus = 'new' | 'acknowledged' | 'dismissed' | 'resolved';

// Core Alert interface
export interface Alert {
  id: string;
  tenant_id: string;
  user_id?: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  
  // Metric data
  metric_name: string;
  metric_value: number;
  threshold_value?: number;
  baseline_value?: number;
  z_score?: number;
  
  // Timestamps
  created_at: Date;
  acknowledged_at?: Date;
  dismissed_at?: Date;
  resolved_at?: Date;
  
  // AI enrichment data (populated asynchronously)
  enrichment?: AlertEnrichment;
  
  // Metadata for tracking and debugging
  metadata: Record<string, unknown>;
}

// Alert enrichment from AI
export interface AlertEnrichment {
  // Analysis results from AI
  root_cause: string;
  recommendations: string[];
  severity_assessment: string;
  
  // Additional context
  related_metrics?: string[];
  affected_components?: string[];
  estimated_impact?: string;
  
  // Processing metadata
  enriched_at: Date;
  model_version: string;
  confidence_score?: number;
}

// Anomaly detection result
export interface Anomaly {
  id: string;
  tenant_id: string;
  metric_name: string;
  detected_at: Date;
  
  // Detection data
  current_value: number;
  baseline_mean: number;
  baseline_std_dev: number;
  z_score: number;
  
  // Detection method details
  detection_method: 'z_score' | 'exponential_smoothing' | 'threshold';
  window_size_days: number;
  
  // Assessment
  is_significant: boolean;
  severity: AlertSeverity;
  
  // Related data points
  data_points: MetricDataPoint[];
}

// Individual metric data point
export interface MetricDataPoint {
  timestamp: Date;
  value: number;
}

// Rolling window configuration
export interface RollingWindowConfig {
  window_size_days: number;
  min_data_points: number;
  aggregation: 'mean' | 'median' | 'sum';
}

// Z-score detection configuration
export interface ZScoreConfig {
  threshold: number;          // Z-score threshold (e.g., 2.0 or 3.0)
  window_size_days: number;   // Rolling window size
  min_data_points: number;    // Minimum data points required
}

// Exponential smoothing configuration
export interface ExponentialSmoothingConfig {
  alpha: number;              // Smoothing factor (0.1-0.3)
  window_size: number;        // Number of values to consider
  change_threshold: number;   // Percentage change to flag
}

// Alert creation request
export interface CreateAlertRequest {
  tenant_id: string;
  user_id?: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metric_name: string;
  metric_value: number;
  threshold_value?: number;
  baseline_value?: number;
  z_score?: number;
  metadata?: Record<string, unknown>;
}

// Alert filter for querying
export interface AlertFilter {
  tenant_id: string;
  user_id?: string;
  status?: AlertStatus[];
  severity?: AlertSeverity[];
  type?: AlertType[];
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

// Alert statistics
export interface AlertStats {
  total_alerts: number;
  by_severity: Record<AlertSeverity, number>;
  by_status: Record<AlertStatus, number>;
  by_type: Record<AlertType, number>;
  average_resolution_time_minutes?: number;
}

// Rate limiting configuration
export interface RateLimitConfig {
  max_alerts_per_hour: number;
  batch_window_ms: number;
  suppression_window_hours: number;
}

// AI enrichment cache entry
export interface EnrichmentCacheEntry {
  pattern_hash: string;
  enrichment: AlertEnrichment;
  created_at: Date;
  expires_at: Date;
}

// Alert delivery notification
export interface AlertNotification {
  alert_id: string;
  tenant_id: string;
  user_ids: string[];
  type: 'single' | 'batch';
  batch_count?: number;
  channel: 'in_app' | 'email' | 'webhook';
  sent_at: Date;
}
