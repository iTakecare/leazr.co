-- =====================================================
-- GoCardless Partner OAuth Integration - Multi-tenant
-- Phase 1: Database Schema
-- =====================================================

-- 1. gocardless_connections - OAuth connections per tenant
CREATE TABLE public.gocardless_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    environment TEXT NOT NULL DEFAULT 'sandbox' CHECK (environment IN ('sandbox', 'live')),
    access_token_encrypted TEXT,
    organisation_id TEXT,
    connected_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'revoked', 'error')),
    verification_status TEXT CHECK (verification_status IN ('successful', 'in_review', 'action_required')),
    verification_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_company_connection UNIQUE (company_id)
);

-- Index for webhook routing by organisation_id
CREATE INDEX idx_gocardless_connections_org_id ON public.gocardless_connections(organisation_id);

-- 2. gocardless_end_customers - End customers for SEPA mandates
CREATE TABLE public.gocardless_end_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    address_line1 TEXT,
    city TEXT,
    postal_code TEXT,
    country_code TEXT DEFAULT 'BE',
    gocardless_customer_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gocardless_end_customers_company ON public.gocardless_end_customers(company_id);
CREATE INDEX idx_gocardless_end_customers_client ON public.gocardless_end_customers(client_id);
CREATE INDEX idx_gocardless_end_customers_gc_id ON public.gocardless_end_customers(gocardless_customer_id);

-- 3. gocardless_mandates - SEPA mandates
CREATE TABLE public.gocardless_mandates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    end_customer_id UUID NOT NULL REFERENCES public.gocardless_end_customers(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    gocardless_mandate_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'pending_submission', 'submitted', 'active', 'cancelled', 'failed', 'expired', 'transferred', 'consumed', 'blocked', 'replaced')),
    scheme TEXT DEFAULT 'sepa_core',
    last_event_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gocardless_mandates_company ON public.gocardless_mandates(company_id);
CREATE INDEX idx_gocardless_mandates_customer ON public.gocardless_mandates(end_customer_id);
CREATE INDEX idx_gocardless_mandates_contract ON public.gocardless_mandates(contract_id);
CREATE INDEX idx_gocardless_mandates_gc_id ON public.gocardless_mandates(gocardless_mandate_id);

-- 4. gocardless_billing_request_flows - Billing request flows for mandate creation
CREATE TABLE public.gocardless_billing_request_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    end_customer_id UUID NOT NULL REFERENCES public.gocardless_end_customers(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    billing_request_id TEXT NOT NULL,
    billing_request_flow_id TEXT,
    flow_url TEXT,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'flow_visited', 'fulfilled', 'cancelled', 'failed')),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gocardless_brf_company ON public.gocardless_billing_request_flows(company_id);
CREATE INDEX idx_gocardless_brf_customer ON public.gocardless_billing_request_flows(end_customer_id);
CREATE INDEX idx_gocardless_brf_br_id ON public.gocardless_billing_request_flows(billing_request_id);

-- 5. gocardless_payments - SEPA payments
CREATE TABLE public.gocardless_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    end_customer_id UUID NOT NULL REFERENCES public.gocardless_end_customers(id) ON DELETE CASCADE,
    mandate_id UUID NOT NULL REFERENCES public.gocardless_mandates(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    gocardless_payment_id TEXT,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    charge_date DATE,
    status TEXT NOT NULL DEFAULT 'pending_submission' CHECK (status IN ('pending_submission', 'submitted', 'confirmed', 'paid_out', 'failed', 'cancelled', 'charged_back', 'customer_approval_denied')),
    idempotency_key TEXT UNIQUE,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gocardless_payments_company ON public.gocardless_payments(company_id);
CREATE INDEX idx_gocardless_payments_mandate ON public.gocardless_payments(mandate_id);
CREATE INDEX idx_gocardless_payments_gc_id ON public.gocardless_payments(gocardless_payment_id);

-- 6. gocardless_subscriptions - Monthly subscriptions
CREATE TABLE public.gocardless_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    mandate_id UUID NOT NULL REFERENCES public.gocardless_mandates(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
    gocardless_subscription_id TEXT UNIQUE,
    amount_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'EUR',
    interval_unit TEXT NOT NULL DEFAULT 'monthly' CHECK (interval_unit IN ('weekly', 'monthly', 'yearly')),
    day_of_month INTEGER CHECK (day_of_month >= 1 AND day_of_month <= 28),
    start_date DATE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'paused', 'cancelled', 'finished')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gocardless_subscriptions_company ON public.gocardless_subscriptions(company_id);
CREATE INDEX idx_gocardless_subscriptions_mandate ON public.gocardless_subscriptions(mandate_id);
CREATE INDEX idx_gocardless_subscriptions_contract ON public.gocardless_subscriptions(contract_id);
CREATE INDEX idx_gocardless_subscriptions_gc_id ON public.gocardless_subscriptions(gocardless_subscription_id);

-- 7. gocardless_webhook_events - Idempotency for webhook processing
CREATE TABLE public.gocardless_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gocardless_event_id TEXT NOT NULL UNIQUE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    resource_type TEXT NOT NULL,
    action TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gocardless_webhook_events_company ON public.gocardless_webhook_events(company_id);
CREATE INDEX idx_gocardless_webhook_events_gc_id ON public.gocardless_webhook_events(gocardless_event_id);

-- 8. OAuth state tokens for CSRF protection
CREATE TABLE public.gocardless_oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    state_token TEXT NOT NULL UNIQUE,
    environment TEXT NOT NULL DEFAULT 'sandbox',
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_gocardless_oauth_states_token ON public.gocardless_oauth_states(state_token);
CREATE INDEX idx_gocardless_oauth_states_company ON public.gocardless_oauth_states(company_id);

-- =====================================================
-- Enable Row Level Security on all tables
-- =====================================================

ALTER TABLE public.gocardless_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gocardless_end_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gocardless_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gocardless_billing_request_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gocardless_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gocardless_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gocardless_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gocardless_oauth_states ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- Security definer function to check company membership
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_belongs_to_company(_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND company_id = _company_id
  )
$$;

-- =====================================================
-- RLS Policies for gocardless_connections
-- =====================================================

CREATE POLICY "Users can view their company's GoCardless connection"
ON public.gocardless_connections
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert their company's GoCardless connection"
ON public.gocardless_connections
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update their company's GoCardless connection"
ON public.gocardless_connections
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete their company's GoCardless connection"
ON public.gocardless_connections
FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- RLS Policies for gocardless_end_customers
-- =====================================================

CREATE POLICY "Users can view their company's end customers"
ON public.gocardless_end_customers
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert their company's end customers"
ON public.gocardless_end_customers
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update their company's end customers"
ON public.gocardless_end_customers
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete their company's end customers"
ON public.gocardless_end_customers
FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- RLS Policies for gocardless_mandates
-- =====================================================

CREATE POLICY "Users can view their company's mandates"
ON public.gocardless_mandates
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert their company's mandates"
ON public.gocardless_mandates
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update their company's mandates"
ON public.gocardless_mandates
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete their company's mandates"
ON public.gocardless_mandates
FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- RLS Policies for gocardless_billing_request_flows
-- =====================================================

CREATE POLICY "Users can view their company's billing request flows"
ON public.gocardless_billing_request_flows
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert their company's billing request flows"
ON public.gocardless_billing_request_flows
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update their company's billing request flows"
ON public.gocardless_billing_request_flows
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete their company's billing request flows"
ON public.gocardless_billing_request_flows
FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- RLS Policies for gocardless_payments
-- =====================================================

CREATE POLICY "Users can view their company's payments"
ON public.gocardless_payments
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert their company's payments"
ON public.gocardless_payments
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update their company's payments"
ON public.gocardless_payments
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete their company's payments"
ON public.gocardless_payments
FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- RLS Policies for gocardless_subscriptions
-- =====================================================

CREATE POLICY "Users can view their company's subscriptions"
ON public.gocardless_subscriptions
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert their company's subscriptions"
ON public.gocardless_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can update their company's subscriptions"
ON public.gocardless_subscriptions
FOR UPDATE
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can delete their company's subscriptions"
ON public.gocardless_subscriptions
FOR DELETE
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- =====================================================
-- RLS Policies for gocardless_webhook_events
-- Service role only (webhooks are processed server-side)
-- =====================================================

CREATE POLICY "Users can view their company's webhook events"
ON public.gocardless_webhook_events
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

-- No INSERT/UPDATE/DELETE for authenticated users - service role only

-- =====================================================
-- RLS Policies for gocardless_oauth_states
-- =====================================================

CREATE POLICY "Users can view their company's oauth states"
ON public.gocardless_oauth_states
FOR SELECT
TO authenticated
USING (public.user_belongs_to_company(company_id));

CREATE POLICY "Users can insert their company's oauth states"
ON public.gocardless_oauth_states
FOR INSERT
TO authenticated
WITH CHECK (public.user_belongs_to_company(company_id));

-- =====================================================
-- Updated_at triggers
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_gocardless_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_gocardless_connections_updated_at
BEFORE UPDATE ON public.gocardless_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_gocardless_updated_at();