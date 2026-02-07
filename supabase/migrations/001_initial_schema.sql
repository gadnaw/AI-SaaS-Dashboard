-- Supabase Migration: Initial Schema
-- Phase 1 - Foundation & Auth
-- Generated: 2026-02-07

-- ============================================================================
-- Organizations Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Profiles Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Customers Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    company TEXT,
    industry TEXT,
    total_revenue NUMERIC(12, 2) DEFAULT 0,
    last_purchase_date TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'churned')),
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Revenue Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS revenue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL,
    date DATE NOT NULL,
    category TEXT,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Activities Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('signup', 'purchase', 'churn', 'login', 'export')),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Audit Logs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AI Usage Log Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    query_id UUID NOT NULL,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
    model TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- User Preferences Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id TEXT PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme_preference TEXT NOT NULL DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Enable RLS on All Tables
-- ============================================================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies - Organizations
-- ============================================================================

-- Users can view their organization
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can update their organization
CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- RLS Policies - Profiles
-- ============================================================================

-- Users can view profiles in their organization
CREATE POLICY "Users can view profiles in org"
  ON profiles FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can manage profiles
CREATE POLICY "Admins can manage profiles"
  ON profiles FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- RLS Policies - Customers
-- ============================================================================

-- Users can view customers in org (excluding soft-deleted)
CREATE POLICY "Users can view customers in org"
  ON customers FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
    AND (deleted_at IS NULL OR deleted_at > NOW())
  );

-- Admins can manage customers
CREATE POLICY "Admins can manage customers"
  ON customers FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- RLS Policies - Revenue
-- ============================================================================

-- Users can view revenue in org
CREATE POLICY "Users can view revenue in org"
  ON revenue FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can manage revenue
CREATE POLICY "Admins can manage revenue"
  ON revenue FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- RLS Policies - Activities
-- ============================================================================

-- Users can view activities in org
CREATE POLICY "Users can view activities in org"
  ON activities FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can manage activities
CREATE POLICY "Admins can manage activities"
  ON activities FOR ALL
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- RLS Policies - Audit Logs
-- ============================================================================

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RLS Policies - AI Usage Log
-- ============================================================================

-- Users can view their own AI usage
CREATE POLICY "Users can view own AI usage"
  ON ai_usage_log FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid())
  );

-- Admins can view all AI usage
CREATE POLICY "Admins can view all AI usage"
  ON ai_usage_log FOR SELECT
  USING (
    organization_id IN (SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- System can insert AI usage logs
CREATE POLICY "System can insert AI usage logs"
  ON ai_usage_log FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RLS Policies - User Preferences
-- ============================================================================

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- Audit Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  audit_record audit_logs;
  org_id UUID;
BEGIN
  -- Get organization_id from the table being modified
  EXECUTE format(
    'SELECT organization_id FROM %I WHERE id = $1',
    TG_TABLE_NAME
  ) INTO org_id USING COALESCE(NEW.id, OLD.id);

  IF TG_OP = 'DELETE' THEN
    audit_record := ROW(
      gen_random_uuid(),
      org_id,
      auth.uid(),
      TG_OP || ' ON ' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      NULL,
      NOW()
    );
    INSERT INTO audit_logs VALUES (audit_record.*);
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    audit_record := ROW(
      gen_random_uuid(),
      org_id,
      auth.uid(),
      TG_OP || ' ON ' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      NOW()
    );
    INSERT INTO audit_logs VALUES (audit_record.*);
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    audit_record := ROW(
      gen_random_uuid(),
      org_id,
      auth.uid(),
      TG_OP || ' ON ' || TG_TABLE_NAME,
      TG_TABLE_NAME,
      NEW.id,
      NULL,
      to_jsonb(NEW),
      NOW()
    );
    INSERT INTO audit_logs VALUES (audit_record.*);
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Audit Triggers
-- ============================================================================

CREATE TRIGGER audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_revenue
  AFTER INSERT OR UPDATE OR DELETE ON revenue
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_activities
  AFTER INSERT OR UPDATE OR DELETE ON activities
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- Performance Indexes
-- ============================================================================

CREATE INDEX idx_customers_org_id ON customers(organization_id);
CREATE INDEX idx_revenue_org_id ON revenue(organization_id);
CREATE INDEX idx_activities_org_id ON activities(organization_id);
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_ai_usage_org_id ON ai_usage_log(organization_id);

CREATE INDEX idx_profiles_user_org ON profiles(id, organization_id);
CREATE INDEX idx_customers_status ON customers(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_revenue_date ON revenue(date);
CREATE INDEX idx_activities_type ON activities(type);
CREATE INDEX idx_ai_usage_date ON ai_usage_log(date);

CREATE INDEX idx_activities_metadata ON activities USING GIN (metadata);
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);

-- ============================================================================
-- Functions
-- ============================================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
