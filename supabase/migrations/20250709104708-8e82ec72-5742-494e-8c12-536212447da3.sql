
-- Migration pour désactiver définitivement les templates iTakecare
-- Cela empêche qu'ils soient visibles dans l'interface utilisateur

UPDATE public.email_templates 
SET active = false 
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0'::uuid;

-- Log de confirmation
DO $$
DECLARE
  updated_count integer;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Templates iTakecare désactivés: % templates', updated_count;
END;
$$;
