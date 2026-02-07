/**
 * Alert Delivery Service
 * 
 * Handles alert delivery through various channels:
 * - In-app notifications (sonner toasts)
 * - Realtime Supabase broadcasts
 * - Email notifications (future)
 * - Webhook notifications (future)
 */

import { toast, Toaster } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { Alert, AlertNotification, CreateAlertRequest } from './types';

/**
 * Delivery channel types
 */
export type DeliveryChannel = 'in_app' | 'email' | 'webhook';

/**
 * Alert Delivery Service
 */
export class AlertDeliveryService {
  private supabase: ReturnType<typeof createClient>;
  private channel: ReturnType<typeof createClient>['channel'];

  constructor() {
    this.supabase = createClient();
    this.channel = this.supabase.channel('alerts');
  }

  /**
   * Initialize the delivery service
   */
  async initialize(): Promise<void> {
    await this.channel.subscribe();
  }

  /**
   * Deliver an alert to all channels
   */
  async deliver(alert: Alert): Promise<AlertNotification[]> {
    const notifications: AlertNotification[] = [];

    // Deliver to in-app
    const inAppNotification = await this.deliverInApp(alert);
    notifications.push(inAppNotification);

    // Broadcast via Supabase
    await this.broadcastAlert(alert);

    return notifications;
  }

  /**
   * Deliver in-app notification
   */
  async deliverInApp(alert: Alert): Promise<AlertNotification> {
    // Show toast based on severity
    const toastOptions = this.getToastOptions(alert);

    if (alert.enrichment) {
      // Show enriched alert with AI recommendations
      toast(
        <div className="space-y-2">
          <div className="font-semibold">{alert.title}</div>
          <div className="text-sm opacity-80">{alert.message}</div>
          {alert.enrichment.recommendations.length > 0 && (
            <div className="text-xs mt-2">
              <div className="font-medium mb-1">AI Recommendation:</div>
              <div>{alert.enrichment.recommendations[0]}</div>
            </div>
          )}
        </div>,
        toastOptions
      );
    } else {
      // Show standard alert
      toast(alert.title, {
        ...toastOptions,
        description: alert.message,
      });
    }

    return {
      alert_id: alert.id,
      tenant_id: alert.tenant_id,
      user_ids: [], // Broadcast to all users
      type: 'single',
      channel: 'in_app',
      sent_at: new Date(),
    };
  }

  /**
   * Get toast options based on alert severity
   */
  private getToastOptions(alert: Alert) {
    const baseOptions = {
      duration: alert.severity === 'critical' ? 10000 : 5000,
      position: 'top-right' as const,
    };

    switch (alert.severity) {
      case 'critical':
        return {
          ...baseOptions,
          style: { background: '#ef4444', color: 'white' },
          icon: '🚨',
        };
      case 'warning':
        return {
          ...baseOptions,
          style: { background: '#f59e0b', color: 'white' },
          icon: '⚠️',
        };
      case 'info':
      default:
        return {
          ...baseOptions,
          style: { background: '#3b82f6', color: 'white' },
          icon: 'ℹ️',
        };
    }
  }

  /**
   * Broadcast alert via Supabase
   */
  async broadcastAlert(alert: Alert): Promise<void> {
    await this.channel.send({
      type: 'broadcast',
      event: 'alert',
      payload: {
        type: 'INSERT',
        new: alert,
      },
    });
  }

  /**
   * Broadcast batch notification
   */
  async broadcastBatch(alerts: Alert[]): Promise<void> {
    await this.channel.send({
      type: 'broadcast',
      event: 'alert_batch',
      payload: {
        type: 'INSERT',
        new: alerts,
        count: alerts.length,
      },
    });

    // Show batch notification
    toast.success(`${alerts.length} new alerts`, {
      description: 'Multiple alerts have been received',
      duration: 4000,
    });
  }

  /**
   * Subscribe to alert notifications
   */
  onAlert(callback: (alert: Alert) => void): () => void {
    return this.channel
      .on('broadcast', { event: 'alert' }, (payload) => {
        if (payload.payload.type === 'INSERT') {
          callback(payload.payload.new as Alert);
        }
      })
      .on('broadcast', { event: 'alert_batch' }, (payload) => {
        if (payload.payload.type === 'INSERT') {
          const alerts = payload.payload.new as Alert[];
          alerts.forEach(callback);
        }
      })
      .subscribe();
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.supabase.removeChannel(this.channel);
  }
}

/**
 * Deliver a batch of alerts
 */
export async function deliverAlertBatch(
  alerts: Alert[],
  deliveryService?: AlertDeliveryService
): Promise<void> {
  const service = deliveryService || new AlertDeliveryService();
  
  await service.initialize();

  if (alerts.length === 1) {
    await service.deliver(alerts[0]);
  } else {
    // Batch deliver
    await service.deliverInApp(alerts[0]);
    await service.broadcastBatch(alerts);
  }

  await service.cleanup();
}

/**
 * Show notification for rate limit exceeded
 */
export function showRateLimitNotification(
  remaining: number,
  resetTime: Date
): void {
  toast.error('Alert rate limit reached', {
    description: `${remaining} alerts remaining. Resets at ${resetTime.toLocaleTimeString()}.`,
    duration: 5000,
  });
}

/**
 * Show notification for suppressed alert
 */
export function showSuppressionNotification(
  reason: string
): void {
  toast.info('Alert suppressed', {
    description: reason,
    duration: 4000,
  });
}

/**
 * Create Toaster component for React
 */
export function AlertToaster() {
  return (
    <Toaster
      position="top-right"
      theme="system"
      richColors
      closeButton
      toastOptions={{
        style: {
          background: 'var(--background)',
          color: 'var(--foreground)',
        },
      }}
    />
  );
}
