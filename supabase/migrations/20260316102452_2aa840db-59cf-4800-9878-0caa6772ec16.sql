-- Add renewal_source_contract_id to offers table
ALTER TABLE public.offers 
ADD COLUMN IF NOT EXISTS renewal_source_contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL;

-- Add category column to support_tickets if not exists
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other';

-- Add created_by_client boolean to support_tickets
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS created_by_client BOOLEAN DEFAULT false;

-- Add ai_conversation_context to support_tickets
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS ai_conversation_context TEXT;

-- Create support_knowledge_base table for AI chat
CREATE TABLE IF NOT EXISTS public.support_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active knowledge base"
ON public.support_knowledge_base
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admin can manage knowledge base"
ON public.support_knowledge_base
FOR ALL
TO authenticated
USING (company_id IN (
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
));

-- Create equipment_locations table (2 levels: site > location)
CREATE TABLE IF NOT EXISTS public.equipment_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  site_name TEXT NOT NULL,
  location_name TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'Belgique',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.equipment_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients can read own locations"
ON public.equipment_locations
FOR SELECT
TO authenticated
USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Clients can manage own locations"
ON public.equipment_locations
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Admin and clients can update locations"
ON public.equipment_locations
FOR UPDATE
TO authenticated
USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
  OR company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- RLS policy for clients to read own tickets
CREATE POLICY "Clients can read own support tickets"
ON public.support_tickets
FOR SELECT
TO authenticated
USING (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);

-- RLS policy for clients to create tickets
CREATE POLICY "Clients can create support tickets"
ON public.support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
  client_id IN (SELECT id FROM public.clients WHERE user_id = auth.uid())
);