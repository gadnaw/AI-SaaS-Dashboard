/**
 * Alert Enrichment Prompts
 * 
 * Prompt templates for GPT-4o-mini to generate:
 * - Root cause analysis
 * - Actionable recommendations
 * - Severity assessment
 */

import type { Alert, Anomaly } from './types';

/**
 * System prompt for alert enrichment
 */
export const ENRICHMENT_SYSTEM_PROMPT = `You are a senior business intelligence analyst specializing in SaaS metrics and operations.

Your role is to analyze anomaly detection alerts and provide:
1. Root cause: The most likely explanation for the anomaly
2. Recommendations: 2-4 actionable steps the user can take
3. Severity assessment: Why this severity level was assigned

Be concise, specific, and actionable. Focus on practical insights over generic advice.

Output format: JSON object with fields:
- root_cause: Brief explanation (1-2 sentences)
- recommendations: Array of 2-4 specific actions
- severity_assessment: Why this severity
- related_metrics: Array of metrics that might be correlated
- confidence_score: 0-1 confidence in analysis`;

/**
 * Generate user prompt for alert enrichment
 */
export function generateEnrichmentPrompt(
  metricName: string,
  currentValue: number,
  baselineMean: number,
  zScore: number,
  severity: string,
  metricContext?: {
    industry?: string;
    recentEvents?: string[];
    metricUnit?: string;
    metricDescription?: string;
  }
): string {
  const direction = zScore > 0 ? 'higher' : 'lower';
  const deviation = baselineMean !== 0 
    ? ((currentValue - baselineMean) / Math.abs(baselineMean) * 100).toFixed(1)
    : 'N/A';

  let contextSection = '';
  if (metricContext) {
    if (metricContext.industry) {
      contextSection += `\nIndustry: ${metricContext.industry}`;
    }
    if (metricContext.recentEvents && metricContext.recentEvents.length > 0) {
      contextSection += `\nRecent events: ${metricContext.recentEvents.join(', ')}`;
    }
    if (metricContext.metricUnit) {
      contextSection += `\nMetric unit: ${metricContext.metricUnit}`;
    }
    if (metricContext.metricDescription) {
      contextSection += `\nMetric description: ${metricContext.metricDescription}`;
    }
  }

  return `Analyze this ${severity} anomaly alert:

**Metric:** ${metricName}
**Current Value:** ${currentValue.toLocaleString()}${metricContext?.metricUnit ? ` ${metricContext.metricUnit}` : ''}
**Baseline (90-day mean):** ${baselineMean.toLocaleString()}${metricContext?.metricUnit ? ` ${metricContext.metricUnit}` : ''}
**Deviation:** ${deviation}% ${direction}
**Z-Score:** ${zScore.toFixed(2)}
${contextSection}

Provide analysis in JSON format with:
- root_cause: Most likely explanation
- recommendations: 2-4 specific actions
- severity_assessment: Why this severity level
- related_metrics: Potential correlated metrics to check
- confidence_score: 0-1 confidence`;
}

/**
 * Generate cache key for similar alerts
 */
export function generateAlertCacheKey(
  metricName: string,
  zScore: number,
  severity: string,
  deviation: number
): string {
  // Round z-score and deviation to reduce noise in cache keys
  const roundedZScore = Math.round(zScore * 2) / 2; // Round to nearest 0.5
  const roundedDeviation = Math.round(deviation / 10) * 10; // Round to nearest 10%
  
  return `${metricName}:${roundedZScore}:${severity}:${roundedDeviation}%`;
}

/**
 * Prompt for rate limit assessment
 */
export const RATE_LIMIT_SYSTEM_PROMPT = `You are an alert triage system. Given multiple similar alerts, determine:
1. Are these truly separate issues or the same root cause?
2. Should additional alerts be suppressed to prevent fatigue?

Return JSON with:
- should_suppress: boolean
- reason: string
- representative_alert_id: string (if suppressing)`;

/**
 * Generate batch alert analysis prompt
 */
export function generateBatchAnalysisPrompt(
  alerts: Array<{
    id: string;
    metricName: string;
    severity: string;
    message: string;
    zScore?: number;
  }>
): string {
  const alertList = alerts
    .map((a, i) => `${i + 1}. [${a.severity.toUpperCase()}] ${a.metricName}: ${a.message}`)
    .join('\n');

  return `Analyze this batch of ${alerts.length} alerts:

${alertList}

Group by likely root cause and provide:
1. How many separate issues (not individual alerts)?
2. Priority order for addressing
3. Any patterns across alerts?

Return JSON with:
- separate_issues_count: number
- priority_order: array of alert indices (most urgent first)
- common_pattern: string (if any pattern detected)
- recommended_actions: array of actions to address the underlying causes`;
}

/**
 * Prompt for enrichment quality check
 */
export function generateQualityCheckPrompt(
  enrichment: {
    root_cause: string;
    recommendations: string[];
    confidence_score?: number;
  },
  originalAlert: Alert
): string {
  return `Review this AI-generated enrichment for quality:

**Alert:** ${originalAlert.title}
**Root Cause:** ${enrichment.root_cause}
**Recommendations:** ${enrichment.recommendations.join(', ')}
**Confidence:** ${enrichment.confidence_score || 'not provided'}

Rate quality on:
1. Relevance: Is the root cause relevant to ${originalAlert.metric_name}?
2. Actionability: Are recommendations specific and actionable?
3. Completeness: Does it cover likely causes?

Return JSON with:
- quality_score: 1-5
- issues: array of any problems found
- suggestions: improvements if quality_score < 3`;
}
