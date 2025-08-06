-- Fix Function Search Path Mutable warnings by adding secure search_path to functions
CREATE OR REPLACE FUNCTION public.update_client_custom_variant_combinations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_client_custom_prices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_client_custom_variant_prices_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_client_logos_bucket()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Cette fonction sera appelée pour s'assurer que le bucket existe
  -- Le bucket sera créé via le service fileStorage.ts côté frontend
  RETURN true;
END;
$function$;

-- Fix any missing RLS policies on tables that have RLS enabled
-- Add policies for chat_agent_status if missing specific user policies
DO $$
BEGIN
  -- Check if chat_agent_status needs additional policies
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chat_agent_status' 
    AND policyname = 'chat_agent_status_user_access'
  ) THEN
    CREATE POLICY "chat_agent_status_user_access" 
    ON public.chat_agent_status 
    FOR ALL 
    USING (agent_id = auth.uid() OR company_id = get_user_company_id() OR is_admin_optimized());
  END IF;
END $$;

-- Ensure all trigger functions have secure search_path
CREATE OR REPLACE FUNCTION public.update_product_packs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;