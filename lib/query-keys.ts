export const queryKeys = {
  // Dashboard
  dashboard: ['dashboard'] as const,
  dashboardMetrics: (orgId: string) => ['dashboard', 'metrics', orgId] as const,
  dashboardAlerts: (orgId: string) => ['dashboard', 'alerts', orgId] as const,

  // Organizations
  organization: (orgId: string) => ['organization', orgId] as const,
  organizationMembers: (orgId: string) => ['organization', orgId, 'members'] as const,

  // Customers
  customers: (orgId: string) => ['customers', orgId] as const,
  customer: (orgId: string, customerId: string) => ['customers', orgId, customerId] as const,
  customerStats: (orgId: string) => ['customers', orgId, 'stats'] as const,

  // Revenue
  revenue: (orgId: string) => ['revenue', orgId] as const,
  revenueTrend: (orgId: string, months: number) => ['revenue', orgId, 'trend', months] as const,
  revenueByCategory: (orgId: string) => ['revenue', orgId, 'category'] as const,

  // Activities
  activities: (orgId: string) => ['activities', orgId] as const,
  activityStats: (orgId: string) => ['activities', orgId, 'stats'] as const,

  // AI
  ai: {
    queries: (orgId: string) => ['ai', 'queries', orgId] as const,
    charts: (orgId: string) => ['ai', 'charts', orgId] as const,
    usage: (orgId: string) => ['ai', 'usage', orgId] as const,
  },

  // User
  userProfile: ['user', 'profile'] as const,
  userPreferences: ['user', 'preferences'] as const,

  // MFA
  mfaStatus: ['mfa', 'status'] as const,
} as const
