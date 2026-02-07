export { db } from '@/lib/db/client'

// Customer repository
export {
  getCustomersByOrg,
  getCustomersPaginated,
  getCustomerById,
  getCustomerStats,
  createCustomer,
  updateCustomer,
  softDeleteCustomer,
  getCustomersByStatus,
  searchCustomers,
  type Customer,
  type NewCustomer,
} from './customer.repository'

// Revenue repository
export {
  getRevenueByOrg,
  getRevenueByDateRange,
  getRevenueByCategory,
  getRevenueByCustomer,
  getRevenueTotals,
  getMonthlyRevenueTrend,
  createRevenue,
  getRecentRevenue,
  getRevenueByCategoryAndPeriod,
  type Revenue,
  type NewRevenue,
} from './revenue.repository'

// Activity repository
export {
  getActivitiesByOrg,
  getActivitiesByType,
  getCustomerActivities,
  getActivityCountsByType,
  createActivity,
  getRecentActivityCount,
  getActivityTimeline,
  getActivitiesByDateRange,
  getActivityStatsByType,
  type Activity,
  type NewActivity,
} from './activity.repository'

// Organization repository
export {
  getOrganizationById,
  getOrganizationBySlug,
  updateOrganization,
  isSlugAvailable,
  getOrganizationStats,
  type Organization,
  type NewOrganization,
} from './organization.repository'

// Profile repository
export {
  getUserProfile,
  getProfilesByOrg,
  updateProfile,
  getProfilesByRole,
  getOrgAdmins,
  isUserOrgAdmin,
  getProfileWithOrg,
  type Profile,
} from './profile.repository'
