-- Désactiver temporairement le trigger
ALTER TABLE public.companies DISABLE TRIGGER auto_create_cloudflare_domain;

-- Créer le broker de démonstration
INSERT INTO public.companies (
  name,
  slug,
  company_type,
  modules_enabled,
  primary_color,
  secondary_color,
  accent_color,
  is_active,
  plan,
  account_status
) VALUES (
  'Broker Demo',
  'broker-demo',
  'broker',
  ARRAY['dashboard', 'clients', 'offers', 'contracts', 'analytics', 'settings', 'workflows', 'leasers', 'ambassadors'],
  '#3b82f6',
  '#64748b',
  '#8b5cf6',
  true,
  'business',
  'active'
);

-- Réactiver le trigger
ALTER TABLE public.companies ENABLE TRIGGER auto_create_cloudflare_domain;

-- Fonction helper pour créer le profil broker après inscription
CREATE OR REPLACE FUNCTION public.create_broker_demo_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  broker_company_id UUID;
BEGIN
  IF NEW.email = 'broker_demo@itakecare.be' THEN
    SELECT id INTO broker_company_id 
    FROM public.companies 
    WHERE slug = 'broker-demo' AND company_type = 'broker'
    LIMIT 1;
    
    IF broker_company_id IS NOT NULL THEN
      INSERT INTO public.profiles (
        id,
        company_id,
        first_name,
        last_name,
        role
      ) VALUES (
        NEW.id,
        broker_company_id,
        'Broker',
        'Demo',
        'broker'
      )
      ON CONFLICT (id) DO UPDATE SET
        company_id = broker_company_id,
        role = 'broker';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Créer le trigger
DROP TRIGGER IF EXISTS on_auth_user_created_broker_demo ON auth.users;
CREATE TRIGGER on_auth_user_created_broker_demo
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_broker_demo_profile();