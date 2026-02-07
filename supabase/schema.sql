-- Supabase Schema Reference Document
-- Phase 1 - Foundation & Auth
-- Generated: 2026-02-07
--
-- This file is for documentation purposes only.
-- Use migrations/supabase/migrate.sql for actual schema changes.

-- ============================================================================
-- Organizations Table
-- Purpose: Multi-tenant organization/account for SaaS
-- ============================================================================
CREATE TABLE organizations (
    -- Primary key: UUID generated automatically
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization details
    name TEXT NOT NULL,                    -- Display name (e.g., "Acme Inc.")
    slug TEXT UNIQUE NOT NULL,              -- URL-friendly identifier (e.g., "acme-inc")
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),  -- When organization was created
    updated_at TIMESTAMPTZ DEFAULT NOW(),   -- Last update timestamp
);

COMMENT ON TABLE organizations IS 'Multi-tenant organization accounts for SaaS customers';
COMMENT ON COLUMN organizations.name IS 'Display name of the organization';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly unique identifier for the organization';

-- ============================================================================
-- Profiles Table
-- Purpose: User profiles linked to auth.users and organizations
-- ============================================================================
CREATE TABLE profiles (
    -- Primary key: Links to auth.users.id
    id TEXT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Profile data
    email TEXT NOT NULL,                    -- User email (from auth.users)
    full_name TEXT,                         -- Optional user full name
    avatar_url TEXT,                        -- Optional avatar URL
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
);

COMMENT ON TABLE profiles IS 'User profiles with organization membership and roles';
COMMENT ON COLUMN profiles.role IS 'User role within the organization: admin or member';

-- ============================================================================
-- Customers Table
-- Purpose: Business customers/contacts for the organization
-- ============================================================================
CREATE TABLE customers (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization reference
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Customer data
    name TEXT NOT NULL,                     -- Customer/contact name
    email TEXT,                             -- Customer email
    company TEXT,                           -- Company name
    industry TEXT,                          -- Industry classification
    total_revenue NUMERIC(12, 2) DEFAULT 0,-- Lifetime revenue from this customer
    last_purchase_date TIMESTAMPTZ,         -- Date of last purchase
    
    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'churned')),
    
    -- Soft delete
    deleted_at TIMESTAMPTZ,                 -- Null if active, set when soft-deleted
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
);

COMMENT ON TABLE customers IS 'Business customers and contacts managed by organizations';
COMMENT ON COLUMN customers.status IS 'Customer status: active, inactive, or churned';
COMMENT ON COLUMN customers.deleted_at IS 'Soft delete timestamp; NULL means active';

-- ============================================================================
-- Revenue Table
-- Purpose: Financial transactions and revenue records
-- ============================================================================
CREATE TABLE revenue (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization reference
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Optional customer reference
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    
    -- Revenue data
    amount NUMERIC(12, 2) NOT NULL,         -- Transaction amount
    date DATE NOT NULL,                     -- Date of transaction
    category TEXT,                           -- Revenue category (e.g., "subscription", "one-time")
    description TEXT,                       -- Transaction description
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
);

COMMENT ON TABLE revenue IS 'Revenue transactions and financial records';
COMMENT ON COLUMN revenue.amount IS 'Transaction amount in USD';

-- ============================================================================
-- Activities Table
-- Purpose: Event tracking and activity log
-- ============================================================================
CREATE TABLE activities (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization reference
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Event data
    type TEXT NOT NULL CHECK (type IN ('signup', 'purchase', 'churn', 'login', 'export')),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,      -- Flexible metadata storage
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
);

COMMENT ON TABLE activities IS 'Activity and event tracking for organizations';
COMMENT ON COLUMN activities.type IS 'Event type: signup, purchase, churn, login, or export';
COMMENT ON COLUMN activities.metadata IS 'Flexible JSON metadata for event-specific data';

-- ============================================================================
-- Audit Logs Table
-- Purpose: Change tracking and audit trail
-- ============================================================================
CREATE TABLE audit_logs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Organization and user references
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Audit data
    action TEXT NOT NULL,                   -- Action performed (INSERT, UPDATE, DELETE)
    table_name TEXT NOT NULL,               -- Table that was modified
    record_id UUID,                         -- ID of the modified record
    old_data JSONB,                          -- Previous state (for UPDATE/DELETE)
    new_data JSONB,                          -- New state (for INSERT/UPDATE)
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
);

COMMENT ON TABLE audit_logs IS 'Audit trail for tracking data changes';
COMMENT ON COLUMN audit_logs.action IS 'Action type: INSERT ON, UPDATE ON, or DELETE ON';
COMMENT ON COLUMN audit_logs.old_data IS 'Previous record state (NULL for INSERT)';
COMMENT ON COLUMN audit_logs.new_data IS 'New record state (NULL for DELETE)';

-- ============================================================================
-- AI Usage Log Table
-- Purpose: Track OpenAI API usage and costs
-- ============================================================================
CREATE TABLE ai_usage_log (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User and organization references
    user_id UUID NOT NULL REFERENCES auth.users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Query tracking
    query_id UUID NOT NULL,                 -- Reference to AI query
    
    -- Usage metrics
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
    model TEXT NOT NULL,                    -- OpenAI model used
    
    -- Date tracking
    date DATE NOT NULL,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW(),
);

COMMENT ON TABLE ai_usage_log IS 'Track OpenAI API usage and costs per organization';
COMMENT ON COLUMN ai_usage_log.cost_usd IS 'Cost in USD (calculated from token counts)';

-- ============================================================================
-- User Preferences Table
-- Purpose: User-specific settings and preferences
-- ============================================================================
CREATE TABLE user_preferences (
    -- Primary key: Links to profiles.id
    user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Preferences
    theme_preference TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
    
    -- Timestamp
    updated_at TIMESTAMPTZ DEFAULT NOW(),
);

COMMENT ON TABLE user_preferences IS 'User-specific application preferences';
COMMENT ON COLUMN user_preferences.theme_preference IS 'Theme: light, dark, or system';

-- ============================================================================
-- Row Level Security (RLS) Policies
-- ============================================================================

-- Organizations: Users can only access their own organization
-- Profiles: Users can see other profiles in their org; admins can manage
-- Customers, Revenue, Activities: Org-scoped access with soft delete
-- Audit Logs: Admin-only access
-- AI Usage Log: User-scoped with admin override

-- ============================================================================
-- Performance Indexes
-- ============================================================================

-- Organization ID indexes (used in all RLS policies)
-- GIN index for JSONB metadata queries
-- Unique index for slug lookups

-- ============================================================================
-- Trigger-Based Audit Logging
-- ============================================================================

-- Automatically creates audit_log entries on:
-- - INSERT, UPDATE, DELETE on customers
-- - INSERT, UPDATE, DELETE on revenue
-- - INSERT, UPDATE, DELETE on activities
