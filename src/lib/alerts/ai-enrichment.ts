/**
 * AI Alert Enrichment Layer
 * 
 * Enriches alerts with AI-generated context using GPT-4o-mini:
 * - Root cause analysis
 * - Actionable recommendations
 * - Severity assessment
 * 
 * Features:
 * - Caching for duplicate patterns (5-minute window)
 * - Rate limiting (5 enrichments/hour/tenant)
 * - Graceful degradation on failures
 */

import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type {
  Alert,
  AlertEnrichment,
  EnrichmentCacheEntry,
  CreateAlertRequest,
} from './types';
import {
  ENRICHMENT_SYSTEM_PROMPT,
  generateEnrichmentPrompt,
  generateAlertCacheKey,
} from './prompts';

// Configuration
const RATE_LIMIT_MAX = 5;           // Max enrichments per hour per tenant
const CACHE_WINDOW_MS = 5 * 60 * 1000;  // 5-minute cache window
const MODEL = 'gpt-4o-mini';         // Cost-effective for analysis tasks

// Zod schema for enrichment response
const enrichmentSchema = z.object({
  root_cause: z.string().min(10).max(500),
  recommendations: z.array(z.string()).min(2).max(5),
  severity_assessment: z.string().min(10).max(500),
  related_metrics: z.array(z.string()).optional(),
  confidence_score: z.number().min(0).max(1).optional(),
});

type EnrichmentResponse = z.infer<typeof enrichmentSchema>;

// In-memory cache and rate limiting (use Redis in production)
const enrichmentCache = new Map<string, EnrichmentCacheEntry>();
const rateLimitTracker = new Map<string, { count: number; windowStart: Date }>();

/**
 * Generate a cache key for an alert
 */
function generateCacheKey(alert: CreateAlertRequest): string {
  const deviation = alert.baseline_value 
    ? ((alert.metric_value - alert.baseline_value) / Math.abs(alert.baseline_value)) * 100
    : 0;
  
  return generateAlertCacheKey(
    alert.metric_name,
    alert.z_score || 0,
    alert.severity,
    deviation
  );
}

/**
 * Check if enrichment is cached
 */
function getCachedEnrichment(cacheKey: string): AlertEnrichment | null {
  const entry = enrichmentCache.get(cacheKey);
  
  if (!entry) return null;
  
  // Check if expired
  if (new Date() > entry.expires_at) {
    enrichmentCache.delete(cacheKey);
    return null;
  }
  
  return entry.enrichment;
}

/**
 * Cache an enrichment result
 */
function cacheEnrichment(cacheKey: string, enrichment: AlertEnrichment): void {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + CACHE_WINDOW_MS);
  
  enrichmentCache.set(cacheKey, {
    pattern_hash: cacheKey,
    enrichment,
    created_at: now,
    expires_at: expiresAt,
  });
  
  // Cleanup old entries periodically
  if (enrichmentCache.size > 1000) {
    cleanupExpiredCache();
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupExpiredCache(): void {
  const now = new Date();
  for (const [key, entry] of enrichmentCache.entries()) {
    if (entry.expires_at < now) {
      enrichmentCache.delete(key);
    }
  }
}

/**
 * Check rate limit for a tenant
 */
function checkRateLimit(tenantId: string): { allowed: boolean; remaining: number; resetTime: Date } {
  const now = new Date();
  const windowStart = rateLimitTracker.get(tenantId)?.windowStart || now;
  
  // Check if window has expired (1 hour)
  if (now.getTime() - windowStart.getTime() > 60 * 60 * 1000) {
    rateLimitTracker.set(tenantId, { count: 0, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT_MAX, resetTime: new Date(now.getTime() + 60 * 60 * 1000) };
  }
  
  const current = rateLimitTracker.get(tenantId)!;
  const remaining = RATE_LIMIT_MAX - current.count;
  
  if (remaining <= 0) {
    return { 
      allowed: false, 
      remaining: 0, 
      resetTime: new Date(windowStart.getTime() + 60 * 60 * 1000) 
    };
  }
  
  return { allowed: true, remaining, resetTime: new Date(windowStart.getTime() + 60 * 60 * 1000) };
}

/**
 * Increment rate limit counter
 */
function incrementRateLimit(tenantId: string): void {
  const now = new Date();
  let tracker = rateLimitTracker.get(tenantId);
  
  if (!tracker || now.getTime() - tracker.windowStart.getTime() > 60 * 60 * 1000) {
    tracker = { count: 0, windowStart: now };
  }
  
  tracker.count++;
  rateLimitTracker.set(tenantId, tracker);
}

/**
 * Call OpenAI to generate enrichment
 */
async function callEnrichmentAPI(
  prompt: string
): Promise<EnrichmentResponse> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: ENRICHMENT_SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1500,
  });

  const content = response.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  // Parse and validate response
  const parsed = JSON.parse(content);
  return enrichmentSchema.parse(parsed);
}

/**
 * Enrich an alert with AI-generated context
 */
export async function enrichAlert(
  alert: CreateAlertRequest,
  metricContext?: {
    industry?: string;
    recentEvents?: string[];
    metricUnit?: string;
    metricDescription?: string;
  }
): Promise<AlertEnrichment | null> {
  // Check rate limit first
  const rateLimit = checkRateLimit(alert.tenant_id);
  
  if (!rateLimit.allowed) {
    console.warn(`[AlertEnrichment] Rate limit exceeded for tenant ${alert.tenant_id}`);
    return null;
  }

  // Check cache
  const cacheKey = generateCacheKey(alert);
  const cached = getCachedEnrichment(cacheKey);
  
  if (cached) {
    console.log(`[AlertEnrichment] Cache hit for ${cacheKey}`);
    return {
      ...cached,
      confidence_score: (cached.confidence_score || 0.9) * 0.95, // Slightly lower confidence for cached
    };
  }

  try {
    // Generate enrichment
    const prompt = generateEnrichmentPrompt(
      alert.metric_name,
      alert.metric_value,
      alert.baseline_value || alert.metric_value,
      alert.z_score || 0,
      alert.severity,
      metricContext
    );

    const enrichmentResponse = await callEnrichmentAPI(prompt);

    const enrichment: AlertEnrichment = {
      root_cause: enrichmentResponse.root_cause,
      recommendations: enrichmentResponse.recommendations,
      severity_assessment: enrichmentResponse.severity_assessment,
      related_metrics: enrichmentResponse.related_metrics,
      enriched_at: new Date(),
      model_version: MODEL,
      confidence_score: enrichmentResponse.confidence_score,
    };

    // Cache the result
    cacheEnrichment(cacheKey, enrichment);
    
    // Increment rate limit
    incrementRateLimit(alert.tenant_id);

    console.log(`[AlertEnrichment] Enriched alert ${alert.metric_name} (${rateLimit.remaining - 1} remaining)`);
    
    return enrichment;
  } catch (error) {
    console.error(`[AlertEnrichment] Failed to enrich alert:`, error);
    
    // Return a fallback enrichment with generic advice
    return {
      root_cause: 'Unable to determine root cause due to AI service temporarily unavailable.',
      recommendations: [
        'Check the metric directly in your dashboard',
        'Review recent changes to your system or configuration',
        'Contact support if the issue persists',
      ],
      severity_assessment: alert.severity === 'critical' 
        ? 'Alert triggered based on statistical thresholds. Manual review recommended.'
        : 'Alert triggered based on statistical thresholds.',
      enriched_at: new Date(),
      model_version: MODEL,
      confidence_score: 0.5,
    };
  }
}

/**
 * Enrich multiple alerts in batch
 */
export async function enrichAlertsBatch(
  alerts: CreateAlertRequest[],
  metricContext?: {
    industry?: string;
    recentEvents?: string[];
  }
): Promise<Map<string, AlertEnrichment | null>> {
  const results = new Map<string, AlertEnrichment | null>();
  
  // Process sequentially to respect rate limits
  for (const alert of alerts) {
    const enrichment = await enrichAlert(alert, metricContext);
    results.set(alert.id, enrichment);
    
    // Small delay between calls to avoid hitting rate limits too fast
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return results;
}

/**
 * Get enrichment statistics for monitoring
 */
export function getEnrichmentStats(): {
  cacheSize: number;
  rateLimitStats: Record<string, number>;
} {
  return {
    cacheSize: enrichmentCache.size,
    rateLimitStats: Object.fromEntries(
      Array.from(rateLimitTracker.entries()).map(([tenant, data]) => [
        tenant,
        data.count,
      ])
    ),
  };
}

/**
 * Clear all caches (for testing/admin)
 */
export function clearEnrichmentCache(): void {
  enrichmentCache.clear();
  rateLimitTracker.clear();
}
