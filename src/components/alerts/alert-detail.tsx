'use client';

import { Alert } from '@/lib/alerts/types';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Zap,
  Lightbulb,
  Activity,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AlertDetailProps {
  alert: Alert;
  onClose: () => void;
  onAcknowledge: () => void;
  onDismiss: () => void;
}

const severityConfig = {
  info: {
    icon: Info,
    color: 'text-blue-600 bg-blue-50 border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    badgeColor: 'bg-yellow-100 text-yellow-800',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-600 bg-red-50 border-red-200',
    badgeColor: 'bg-red-100 text-red-800',
  },
};

export function AlertDetail({ alert, onClose, onAcknowledge, onDismiss }: AlertDetailProps) {
  const severity = severityConfig[alert.severity];
  const Icon = severity.icon;

  const isTrendUp = (alert.z_score || 0) > 0;
  const percentageChange = alert.baseline_value
    ? ((alert.metric_value - alert.baseline_value) / Math.abs(alert.baseline_value)) * 100
    : 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', severity.color)}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl">{alert.title}</DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', severity.badgeColor)}>
                  {alert.severity.toUpperCase()}
                </span>
                <span className="text-sm text-muted-foreground">
                  {format(alert.created_at, 'MMM d, yyyy h:mm a')}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Alert Info */}
          <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm text-muted-foreground">Metric</p>
              <p className="font-semibold">{alert.metric_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Value</p>
              <p className="font-semibold text-lg">{alert.metric_value.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Baseline (90-day)</p>
              <p className="font-semibold">{alert.baseline_value?.toLocaleString() || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Change</p>
              <div className={cn(
                'flex items-center gap-1 font-semibold',
                isTrendUp ? 'text-red-600' : 'text-green-600'
              )}>
                {isTrendUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {percentageChange > 0 ? '+' : ''}{percentageChange.toFixed(1)}%
              </div>
            </div>
            {alert.z_score !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Z-Score</p>
                <p className={cn(
                  'font-semibold',
                  Math.abs(alert.z_score) > 2 ? 'text-red-600' : 'text-yellow-600'
                )}>
                  {alert.z_score.toFixed(2)}σ
                </p>
              </div>
            )}
          </div>

          {/* Message */}
          <div>
            <h4 className="font-medium mb-2">Alert Message</h4>
            <p className="text-muted-foreground">{alert.message}</p>
          </div>

          {/* AI Enrichment */}
          {alert.enrichment ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                <h4 className="font-medium">AI Analysis</h4>
                <span className="text-xs text-muted-foreground">
                  (v{alert.enrichment.model_version})
                </span>
              </div>

              {/* Root Cause */}
              <div className="p-4 rounded-lg border bg-purple-50/50">
                <div className="flex items-start gap-2">
                  <Activity className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-purple-900 mb-1">Root Cause</h5>
                    <p className="text-sm text-purple-800">{alert.enrichment.root_cause}</p>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              <div className="p-4 rounded-lg border bg-blue-50/50">
                <div className="flex items-start gap-2">
                  <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-blue-900 mb-2">Recommendations</h5>
                    <ol className="space-y-2">
                      {alert.enrichment.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-blue-800">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium">
                            {i + 1}
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              {/* Severity Assessment */}
              <div className="p-4 rounded-lg bg-muted/50">
                <h5 className="font-medium mb-1">Severity Assessment</h5>
                <p className="text-sm text-muted-foreground">{alert.enrichment.severity_assessment}</p>
              </div>

              {/* Related Metrics */}
              {alert.enrichment.related_metrics && alert.enrichment.related_metrics.length > 0 && (
                <div>
                  <h5 className="font-medium mb-2">Related Metrics to Check</h5>
                  <div className="flex flex-wrap gap-2">
                    {alert.enrichment.related_metrics.map((metric, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm"
                      >
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              {alert.enrichment.confidence_score && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Confidence:</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        alert.enrichment.confidence_score > 0.8 ? 'bg-green-500' :
                        alert.enrichment.confidence_score > 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                      )}
                      style={{ width: `${alert.enrichment.confidence_score * 100}%` }}
                    />
                  </div>
                  <span className="font-medium">
                    {(alert.enrichment.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-muted/50 text-center text-muted-foreground">
              <p>AI enrichment pending or unavailable</p>
              <p className="text-sm mt-1">
                This alert will be enriched automatically when AI processing completes.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            {alert.status === 'new' && (
              <>
                <Button variant="outline" onClick={onDismiss}>
                  <XCircle className="w-4 h-4 mr-2" />
                  Dismiss
                </Button>
                <Button onClick={onAcknowledge}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Acknowledge
                </Button>
              </>
            )}
            {alert.status === 'acknowledged' && (
              <Button variant="outline" onClick={onDismiss}>
                <XCircle className="w-4 h-4 mr-2" />
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
