// Stub alerting - Phase 2 functionality
export type AlertType = 'threshold' | 'anomaly' | 'budget'

export async function checkAlert(orgId: string, period: string): Promise<AlertType | null> {
  return null
}

export async function checkAllPeriodsForAlerts(orgId: string): Promise<AlertType[]> {
  return []
}
