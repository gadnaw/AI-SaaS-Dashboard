'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeSubscription } from '@/lib/realtime/hooks';
import { AlertItem } from './alert-item';
import { AlertDetail } from './alert-detail';
import { Alert, AlertStatus } from '@/lib/alerts/types';
import { Toaster } from 'sonner';

interface AlertListProps {
  tenantId: string;
  userId?: string;
  limit?: number;
}

export function AlertList({ tenantId, userId, limit = 50 }: AlertListProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [filter, setFilter] = useState<AlertStatus | 'all'>('all');
  const supabase = createClient();

  // Fetch initial alerts
  const fetchAlerts = useCallback(async () => {
    try {
      let query = supabase
        .from('alerts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Transform to Alert type
      const transformedAlerts: Alert[] = (data || []).map(item => ({
        id: item.id,
        tenant_id: item.tenant_id,
        user_id: item.user_id,
        type: item.type,
        severity: item.severity,
        status: item.status,
        title: item.title,
        message: item.message,
        metric_name: item.metric_name,
        metric_value: item.metric_value,
        threshold_value: item.threshold_value,
        baseline_value: item.baseline_value,
        z_score: item.z_score,
        created_at: new Date(item.created_at),
        acknowledged_at: item.acknowledged_at ? new Date(item.acknowledged_at) : undefined,
        dismissed_at: item.dismissed_at ? new Date(item.dismissed_at) : undefined,
        resolved_at: item.resolved_at ? new Date(item.resolved_at) : undefined,
        enrichment: item.enrichment ? {
          ...item.enrichment,
          enriched_at: new Date(item.enrichment.enriched_at),
        } : undefined,
        metadata: item.metadata || {},
      }));

      setAlerts(transformedAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId, limit, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  // Real-time subscription for new alerts
  useRealtimeSubscription(
    `alerts:${tenantId}`,
    ['INSERT', 'UPDATE'],
    (payload) => {
      if (payload.eventType === 'INSERT') {
        const newAlert = transformAlert(payload.new);
        setAlerts(prev => [newAlert, ...prev.slice(0, limit - 1)]);
        
        // Show toast for new alert
        if (newAlert.severity === 'critical') {
          // Critical alert notification
        }
      } else if (payload.eventType === 'UPDATE') {
        const updatedAlert = transformAlert(payload.new);
        setAlerts(prev => 
          prev.map(alert => alert.id === updatedAlert.id ? updatedAlert : alert)
        );
      }
    }
  );

  // Transform database row to Alert type
  const transformAlert = (row: Record<string, unknown>): Alert => ({
    id: row.id as string,
    tenant_id: row.tenant_id as string,
    user_id: row.user_id as string | undefined,
    type: row.type as Alert['type'],
    severity: row.severity as Alert['severity'],
    status: row.status as AlertStatus,
    title: row.title as string,
    message: row.message as string,
    metric_name: row.metric_name as string,
    metric_value: row.metric_value as number,
    threshold_value: row.threshold_value as number | undefined,
    baseline_value: row.baseline_value as number | undefined,
    z_score: row.z_score as number | undefined,
    created_at: new Date(row.created_at as string),
    acknowledged_at: row.acknowledged_at ? new Date(row.acknowledged_at as string) : undefined,
    dismissed_at: row.dismissed_at ? new Date(row.dismissed_at as string) : undefined,
    resolved_at: row.resolved_at ? new Date(row.resolved_at as string) : undefined,
    enrichment: row.enrichment ? {
      ...(row.enrichment as Record<string, unknown>),
      enriched_at: new Date((row.enrichment as Record<string, string>).enriched_at),
    } : undefined,
    metadata: (row.metadata as Record<string, unknown>) || {},
  });

  // Handle alert actions
  const handleAcknowledge = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ 
          status: 'acknowledged',
          acknowledged_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev =>
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, status: 'acknowledged', acknowledged_at: new Date() }
            : alert
        )
      );

      if (selectedAlert?.id === alertId) {
        setSelectedAlert(prev => 
          prev ? { ...prev, status: 'acknowledged', acknowledged_at: new Date() } : null
        );
      }
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const handleDismiss = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ 
          status: 'dismissed',
          dismissed_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => 
        prev.map(alert =>
          alert.id === alertId
            ? { ...alert, status: 'dismissed', dismissed_at: new Date() }
            : alert
        )
      );

      if (selectedAlert?.id === alertId) {
        setSelectedAlert(null);
      }
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'all') return true;
    return alert.status === filter;
  });

  // Count by status
  const counts = {
    all: alerts.length,
    new: alerts.filter(a => a.status === 'new').length,
    acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
    dismissed: alerts.filter(a => a.status === 'dismissed').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Alerts</h2>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-muted h-20 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Alerts</h2>
        <div className="text-sm text-muted-foreground">
          {counts.new} new
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'new', 'acknowledged', 'dismissed'] as const).map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 rounded-full text-sm transition-colors ${
              filter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1 text-xs opacity-70">
                ({counts[status as keyof typeof counts]})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No {filter === 'all' ? '' : filter} alerts
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <AlertItem
              key={alert.id}
              alert={alert}
              onSelect={() => setSelectedAlert(alert)}
              onAcknowledge={() => handleAcknowledge(alert.id)}
              onDismiss={() => handleDismiss(alert.id)}
            />
          ))
        )}
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <AlertDetail
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
          onAcknowledge={() => {
            handleAcknowledge(selectedAlert.id);
            setSelectedAlert(prev => 
              prev ? { ...prev, status: 'acknowledged' } : null
            );
          }}
          onDismiss={() => {
            handleDismiss(selectedAlert.id);
          }}
        />
      )}
    </div>
  );
}
