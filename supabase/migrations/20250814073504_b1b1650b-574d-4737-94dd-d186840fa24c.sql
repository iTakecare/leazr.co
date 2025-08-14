-- Final Security Cleanup - Fix remaining vulnerabilities (corrected)

-- 1. Fix all database functions missing search_path protection
-- Update functions to include SET search_path TO 'public'

CREATE OR REPLACE FUNCTION public.get_company_dashboard_metrics()
RETURNS TABLE(total_clients bigint, total_offers bigint, total_contracts bigint, total_revenue numeric, pending_offers bigint, active_contracts bigint, recent_signups bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    user_company_id uuid;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::numeric, 0::bigint, 0::bigint, 0::bigint;
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM clients WHERE company_id = user_company_id)::bigint,
        (SELECT COUNT(*) FROM offers WHERE company_id = user_company_id)::bigint,
        (SELECT COUNT(*) FROM contracts WHERE company_id = user_company_id)::bigint,
        (SELECT COALESCE(SUM(monthly_payment), 0) FROM contracts WHERE company_id = user_company_id)::numeric,
        (SELECT COUNT(*) FROM offers WHERE company_id = user_company_id AND status = 'pending')::bigint,
        (SELECT COUNT(*) FROM contracts WHERE company_id = user_company_id AND status = 'active')::bigint,
        (SELECT COUNT(*) FROM clients WHERE company_id = user_company_id AND created_at >= now() - interval '30 days')::bigint;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_offer_equipment_attributes_secure(p_equipment_id uuid, p_attributes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  attr_key text;
  attr_value text;
BEGIN
  FOR attr_key, attr_value IN SELECT * FROM jsonb_each_text(p_attributes)
  LOOP
    INSERT INTO public.offer_equipment_attributes (
      equipment_id,
      key,
      value
    ) VALUES (
      p_equipment_id,
      attr_key,
      attr_value
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_offer_equipment_specifications_secure(p_equipment_id uuid, p_specifications jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  spec_key text;
  spec_value text;
BEGIN
  FOR spec_key, spec_value IN SELECT * FROM jsonb_each_text(p_specifications)
  LOOP
    INSERT INTO public.offer_equipment_specifications (
      equipment_id,
      key,
      value
    ) VALUES (
      p_equipment_id,
      spec_key,
      spec_value
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_create_cloudflare_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  generated_subdomain text;
BEGIN
  -- Générer un sous-domaine unique
  generated_subdomain := public.generate_company_subdomain(NEW.name);
  
  -- Créer l'entrée dans company_domains (sera mise à jour par l'edge function)
  INSERT INTO public.company_domains (
    company_id,
    domain,
    subdomain,
    is_active,
    is_primary
  ) VALUES (
    NEW.id,
    'leazr.co',
    generated_subdomain,
    false, -- Sera activé après création Cloudflare
    true
  )
  ON CONFLICT (company_id, subdomain) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- 2. Secure companies table - Remove and recreate policy
DROP POLICY IF EXISTS "companies_catalog_token_access" ON public.companies;

-- Only allow authenticated company access and specific public catalog access
CREATE POLICY "companies_secure_catalog_access" 
ON public.companies 
FOR SELECT 
TO anon 
USING (
  -- Only basic company info for catalog API with valid tokens
  id IN (
    SELECT DISTINCT o.company_id
    FROM offers o
    JOIN offer_upload_links oul ON o.id = oul.offer_id
    WHERE oul.expires_at > now() 
    AND oul.used_at IS NULL
  )
);