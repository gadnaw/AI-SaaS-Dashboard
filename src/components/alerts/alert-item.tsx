'use client';

import { Alert } from '@/lib/alerts/types';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  XCircle,
  ChevronRight 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface AlertItemProps {
  alert: Alert;
  onSelect: () => void;
  onAcknowledge: () => void;
  onDismiss: () => void;
}

const severityConfig = {
  info: {
    icon: Info,
    color: 'text-blue-500 bg-blue-50 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  warning: {
    icon: AlertTriangle,
    color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
    dotColor: 'bg-yellow-500',
  },
  critical: {
    icon: AlertCircle,
    color: 'text-red-600 bg-red-50 border-red-200',
    dotColor: 'bg-red-500',
  },
};

const statusConfig = {
  new: {
    icon: null,
    label: 'New',
    className: 'font-medium',
  },
  acknowledged: {
    icon: CheckCircle2,
    label: 'Acknowledged',
    className: 'text-muted-foreground',
  },
  dismissed: {
    icon: XCircle,
    label: 'Dismissed',
    className: 'text-muted-foreground opacity-60',
  },
  resolved: {
    icon: CheckCircle2,
    label: 'Resolved',
    className: 'text-muted-foreground',
  },
};

export function AlertItem({ alert, onSelect, onAcknowledge, onDismiss }: AlertItemProps) {
  const severity = severityConfig[alert.severity];
  const status = statusConfig[alert.status];
  const Icon = severity.icon;
  const StatusIcon = status.icon;

  return (
    <div
      onClick={onSelect}
      className={cn(
        'group relative p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md',
        severity.color,
        alert.status === 'dismissed' && 'opacity-60'
      )}
    >
      {/* Severity indicator dot */}
      <div className={cn(
        'absolute left-2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full',
        severity.dotColor,
        alert.status === 'new' && 'animate-pulse'
      )} />

      <div className="pl-6 pr-20">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          {StatusIcon && (
            <StatusIcon className="w-4 h-4" />
          )}
          <span className={cn('text-xs uppercase tracking-wide', status.className)}>
            {status.label}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(alert.created_at, { addSuffix: true })}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold mb-1">{alert.title}</h3>

        {/* Message */}
        <p className="text-sm opacity-80 line-clamp-2">{alert.message}</p>

        {/* Metric details */}
        <div className="flex items-center gap-4 mt-2 text-xs opacity-70">
          <span>{alert.metric_name}</span>
          {alert.z_score !== undefined && (
            <span className={cn(
              'px-2 py-0.5 rounded',
              Math.abs(alert.z_score) > 2 ? 'bg-red-100' : 'bg-yellow-100'
            )}>
              Z-score: {alert.z_score.toFixed(2)}
            </span>
          )}
          {alert.enrichment && (
            <span className="flex items-center gap-1">
              <Icon className="w-3 h-3" />
              AI enriched
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {alert.status === 'new' && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAcknowledge();
              }}
              className="p-2 rounded hover:bg-white/50 transition-colors"
              title="Acknowledge"
            >
              <CheckCircle2 className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-2 rounded hover:bg-white/50 transition-colors"
              title="Dismiss"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </>
        )}
        <ChevronRight className="w-4 h-4 opacity-50" />
      </div>
    </div>
  );
}
