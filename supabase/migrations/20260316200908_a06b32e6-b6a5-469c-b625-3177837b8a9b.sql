
-- MDM Profiles (configuration profiles: wifi, vpn, restrictions, etc.)
CREATE TABLE public.mdm_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  profile_type TEXT NOT NULL DEFAULT 'custom' CHECK (profile_type IN ('wifi', 'vpn', 'restriction', 'email', 'certificate', 'custom')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  platform TEXT NOT NULL DEFAULT 'all' CHECK (platform IN ('windows', 'macos', 'ios', 'android', 'linux', 'all')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MDM Device Profiles (assignment: device <-> profile)
CREATE TABLE public.mdm_device_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.mdm_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'failed', 'removed')),
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(equipment_id, profile_id)
);

-- MDM Enrollment Tokens
CREATE TABLE public.mdm_enrollment_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipment_id UUID,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  description TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MDM Commands (remote commands sent to devices)
CREATE TABLE public.mdm_commands (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL,
  command_type TEXT NOT NULL CHECK (command_type IN ('lock', 'wipe', 'restart', 'shutdown', 'script', 'notification', 'update_os', 'inventory')),
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'completed', 'failed', 'cancelled')),
  result JSONB,
  error_message TEXT,
  initiated_by UUID,
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.mdm_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdm_device_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdm_enrollment_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mdm_commands ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mdm_profiles
CREATE POLICY "mdm_profiles_select" ON public.mdm_profiles FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mdm_profiles_insert" ON public.mdm_profiles FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mdm_profiles_update" ON public.mdm_profiles FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mdm_profiles_delete" ON public.mdm_profiles FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for mdm_device_profiles
CREATE POLICY "mdm_device_profiles_select" ON public.mdm_device_profiles FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mdm_device_profiles_insert" ON public.mdm_device_profiles FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mdm_device_profiles_update" ON public.mdm_device_profiles FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mdm_device_profiles_delete" ON public.mdm_device_profiles FOR DELETE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for mdm_enrollment_tokens
CREATE POLICY "mdm_enrollment_tokens_select" ON public.mdm_enrollment_tokens FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mdm_enrollment_tokens_insert" ON public.mdm_enrollment_tokens FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mdm_enrollment_tokens_update" ON public.mdm_enrollment_tokens FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- RLS Policies for mdm_commands
CREATE POLICY "mdm_commands_select" ON public.mdm_commands FOR SELECT TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mdm_commands_insert" ON public.mdm_commands FOR INSERT TO authenticated
  WITH CHECK (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));
CREATE POLICY "mdm_commands_update" ON public.mdm_commands FOR UPDATE TO authenticated
  USING (company_id IN (SELECT company_id FROM public.profiles WHERE id = auth.uid()));

-- Service role policies (for API key access via catalog-api)
CREATE POLICY "mdm_profiles_service" ON public.mdm_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "mdm_device_profiles_service" ON public.mdm_device_profiles FOR ALL TO service_role USING (true);
CREATE POLICY "mdm_enrollment_tokens_service" ON public.mdm_enrollment_tokens FOR ALL TO service_role USING (true);
CREATE POLICY "mdm_commands_service" ON public.mdm_commands FOR ALL TO service_role USING (true);

-- Indexes for performance
CREATE INDEX idx_mdm_profiles_company ON public.mdm_profiles(company_id);
CREATE INDEX idx_mdm_device_profiles_company ON public.mdm_device_profiles(company_id);
CREATE INDEX idx_mdm_device_profiles_equipment ON public.mdm_device_profiles(equipment_id);
CREATE INDEX idx_mdm_enrollment_tokens_company ON public.mdm_enrollment_tokens(company_id);
CREATE INDEX idx_mdm_enrollment_tokens_token ON public.mdm_enrollment_tokens(token);
CREATE INDEX idx_mdm_commands_company ON public.mdm_commands(company_id);
CREATE INDEX idx_mdm_commands_equipment ON public.mdm_commands(equipment_id);
CREATE INDEX idx_mdm_commands_status ON public.mdm_commands(status);
