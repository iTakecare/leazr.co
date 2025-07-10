-- Corriger la fonction get_user_company_id pour qu'elle fonctionne correctement
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT company_id FROM public.get_current_user_profile() LIMIT 1;
$$;

-- Supprimer toutes les politiques RLS existantes sur leasers
DROP POLICY IF EXISTS "leasers_company_strict_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_strict_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_company_isolation" ON public.leasers;
DROP POLICY IF EXISTS "leasers_access" ON public.leasers;

-- Créer UNE SEULE politique RLS stricte pour les leasers
CREATE POLICY "leasers_company_strict_isolation" 
ON public.leasers 
FOR ALL 
USING (
  -- Condition stricte: l'utilisateur doit avoir un company_id valide ET l'accès est limité à sa propre entreprise
  (get_user_company_id() IS NOT NULL) AND 
  (
    -- Le leaser appartient à la même entreprise OU l'utilisateur est admin
    (company_id = get_user_company_id()) OR 
    is_admin_optimized()
  )
)
WITH CHECK (
  -- Pour les modifications, même logique stricte
  (get_user_company_id() IS NOT NULL) AND 
  (
    (company_id = get_user_company_id()) OR 
    is_admin_optimized()
  )
);

-- Nettoyer les leasers d'iTakecare qui sont visibles par d'autres entreprises
-- Supprimer les leasers d'iTakecare pour éviter les fuites de données
DELETE FROM public.leasers 
WHERE company_id = 'c1ce66bb-3ad2-474d-b477-583baa7ff1c0';  -- iTakecare company ID