/**
 * Alert Rate Limiter
 * 
 * Implements rate limiting for alert delivery:
 * - 5 alerts/hour limit per tenant
 * - Batching within 5-minute window
 * - Suppression for same alert type within 1 hour
 * 
 * Uses Supabase for persistence (use Redis in production)
 */

import { createClient } from '@/lib/supabase/client';
import type { CreateAlertRequest, RateLimitConfig, AlertNotification } from './types';

// Default configuration
const DEFAULT_CONFIG: RateLimitConfig = {
  max_alerts_per_hour: 5,
  batch_window_ms: 5 * 60 * 1000,  // 5 minutes
  suppression_window_hours: 1,
};

// In-memory tracking (use Redis in production)
const rateLimitMemory = new Map<string, { count: number; windowStart: Date }>();
const suppressionMemory = new Map<string, Date>();
const batchMemory = new Map<string, { alerts: CreateAlertRequest[]; timer: NodeJS.Timeout }>();

/**
 * Check if a tenant can send an alert
 */
export async function checkRateLimit(
  tenantId: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ allowed: boolean; remaining: number; resetTime: Date; reason?: string }> {
  const now = new Date();
  let tracker = rateLimitMemory.get(tenantId);

  // Check if window has expired
  if (!tracker || now.getTime() - tracker.windowStart.getTime() > 60 * 60 * 1000) {
    tracker = { count: 0, windowStart: now };
    rateLimitMemory.set(tenantId, tracker);
  }

  const remaining = config.max_alerts_per_hour - tracker.count;
  const resetTime = new Date(tracker.windowStart.getTime() + 60 * 60 * 1000);

  if (remaining <= 0) {
    return {
      allowed: false,
      remaining: 0,
      resetTime,
      reason: 'Rate limit exceeded. Maximum 5 alerts per hour.',
    };
  }

  return {
    allowed: true,
    remaining,
    resetTime,
  };
}

/**
 * Increment rate limit counter
 */
function incrementRateLimit(tenantId: string): void {
  const tracker = rateLimitMemory.get(tenantId);
  if (tracker) {
    tracker.count++;
    rateLimitMemory.set(tenantId, tracker);
  }
}

/**
 * Check if an alert should be suppressed
 */
export async function checkSuppression(
  tenantId: string,
  alert: CreateAlertRequest,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ suppressed: boolean; reason?: string }> {
  // Create suppression key based on metric name and type
  const suppressionKey = `${tenantId}:${alert.type}:${alert.metric_name}`;
  
  const lastSuppressed = suppressionMemory.get(suppressionKey);
  const now = new Date();

  if (lastSuppressed) {
    const hoursSince = (now.getTime() - lastSuppressed.getTime()) / (1000 * 60 * 60);
    
    if (hoursSince < config.suppression_window_hours) {
      return {
        suppressed: true,
        reason: `Similar alert suppressed within ${config.suppression_window_hours} hour window`,
      };
    }
  }

  return { suppressed: false };
}

/**
 * Record a suppression
 */
function recordSuppression(tenantId: string, alert: CreateAlertRequest): void {
  const suppressionKey = `${tenantId}:${alert.type}:${alert.metric_name}`;
  suppressionMemory.set(suppressionKey, new Date());
}

/**
 * Queue alert for batching
 */
export async function queueForBatching(
  tenantId: string,
  alert: CreateAlertRequest,
  config: RateLimitConfig = DEFAULT_CONFIG
): Promise<{ batched: boolean; existingCount: number }> {
  const batchKey = `${tenantId}:${alert.type}`;
  
  let batch = batchMemory.get(batchKey);
  
  if (!batch) {
    // Create new batch with timer
    const timer = setTimeout(() => {
      flushBatch(tenantId, batchKey);
    }, config.batch_window_ms);

    batch = { alerts: [], timer };
    batchMemory.set(batchKey, batch);
  }

  batch.alerts.push(alert);

  return {
    batched: true,
    existingCount: batch.alerts.length,
  };
}

/**
 * Flush a batch of alerts
 */
async function flushBatch(tenantId: string, batchKey: string): Promise<void> {
  const batch = batchMemory.get(batchKey);
  if (!batch || batch.alerts.length === 0) return;

  // Deduplicate alerts
  const deduped = deduplicateAlerts(batch.alerts);

  // Process each unique alert
  for (const alert of deduped) {
    await processAlert(tenantId, alert);
  }

  // Clear batch
  batchMemory.delete(batchKey);
}

/**
 * Deduplicate similar alerts
 */
function deduplicateAlerts(alerts: CreateAlertRequest[]): CreateAlertRequest[] {
  const byMetric = new Map<string, CreateAlertRequest>();

  for (const alert of alerts) {
    const key = `${alert.metric_name}:${alert.severity}`;
    const existing = byMetric.get(key);

    // Keep the most severe or first alert
    if (!existing || severityOrder(alert.severity) < severityOrder(existing.severity)) {
      byMetric.set(key, alert);
    }
  }

  return Array.from(byMetric.values());
}

/**
 * Severity order for deduplication (lower = more severe)
 */
function severityOrder(severity: string): number {
  const order = { critical: 0, warning: 1, info: 2 };
  return order[severity as keyof typeof order] || 3;
}

/**
 * Process a single alert
 */
async function processAlert(
  tenantId: string,
  alert: CreateAlertRequest
): Promise<void> {
  // Check rate limit
  const rateLimit = await checkRateLimit(tenantId);
  
  if (!rateLimit.allowed) {
    console.log(`[RateLimiter] Alert rate limited for ${tenantId}: ${rateLimit.reason}`);
    return;
  }

  // Check suppression
  const suppression = await checkSuppression(tenantId, alert);
  
  if (suppression.suppressed) {
    console.log(`[RateLimiter] Alert suppressed for ${tenantId}: ${suppression.reason}`);
    return;
  }

  // Store alert in database
  await storeAlert(tenantId, alert);

  // Increment rate limit
  incrementRateLimit(tenantId);

  // Record suppression for future duplicates
  recordSuppression(tenantId, alert);

  console.log(`[RateLimiter] Alert delivered for ${tenantId}: ${alert.title}`);
}

/**
 * Store alert in Supabase
 */
async function storeAlert(
  tenantId: string,
  alert: CreateAlertRequest
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.from('alerts').insert({
    tenant_id: alert.tenant_id,
    user_id: alert.user_id,
    type: alert.type,
    severity: alert.severity,
    status: 'new',
    title: alert.title,
    message: alert.message,
    metric_name: alert.metric_name,
    metric_value: alert.metric_value,
    threshold_value: alert.threshold_value,
    baseline_value: alert.baseline_value,
    z_score: alert.z_score,
    metadata: alert.metadata,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[RateLimiter] Error storing alert:', error);
    throw error;
  }
}

/**
 * Deliver an alert through the rate limiter
 */
export async function deliverAlert(
  tenantId: string,
  alert: CreateAlertRequest
): Promise<{ delivered: boolean; reason?: string; batched?: boolean }> {
  // Check rate limit
  const rateLimit = await checkRateLimit(tenantId);
  
  if (!rateLimit.allowed) {
    return {
      delivered: false,
      reason: rateLimit.reason,
    };
  }

  // Check suppression
  const suppression = await checkSuppression(tenantId, alert);
  
  if (suppression.suppressed) {
    return {
      delivered: false,
      reason: suppression.reason,
    };
  }

  // Queue for batching
  const batchResult = await queueForBatching(tenantId, alert);

  return {
    delivered: true,
    batched: batchResult.batched,
  };
}

/**
 * Flush all pending batches
 */
export async function flushAllBatches(): Promise<void> {
  for (const [batchKey, batch] of batchMemory.entries()) {
    clearTimeout(batch.timer);
    const [tenantId] = batchKey.split(':');
    await flushBatch(tenantId, batchKey);
  }
}

/**
 * Get rate limit statistics
 */
export function getRateLimitStats(): {
  activeTenants: number;
  suppressedPatterns: number;
  pendingBatches: number;
} {
  return {
    activeTenants: rateLimitMemory.size,
    suppressedPatterns: suppressionMemory.size,
    pendingBatches: batchMemory.size,
  };
}

/**
 * Clear all in-memory state (for testing)
 */
export function clearRateLimitState(): void {
  rateLimitMemory.clear();
  suppressionMemory.clear();
  
  for (const [, batch] of batchMemory) {
    clearTimeout(batch.timer);
  }
  batchMemory.clear();
}
