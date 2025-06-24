
-- Mettre à jour l'ambassadeur existant pour le lier correctement à l'utilisateur
UPDATE public.ambassadors 
SET user_id = '82cecd7c-b299-4fbf-b6e2-4fd9428a9d66'::uuid
WHERE email = 'demo@itakecare.be' 
AND (user_id IS NULL OR user_id != '82cecd7c-b299-4fbf-b6e2-4fd9428a9d66'::uuid);

-- S'assurer que l'ambassadeur a un company_id valide
UPDATE public.ambassadors 
SET company_id = (
  SELECT company_id 
  FROM public.profiles 
  WHERE id = '82cecd7c-b299-4fbf-b6e2-4fd9428a9d66'::uuid
)
WHERE email = 'demo@itakecare.be' 
AND company_id IS NULL;
