-- Ajouter une politique RLS permettant aux ambassadeurs de créer des offres
-- et de voir/modifier leurs propres offres de type ambassador_offer

-- D'abord, créer une fonction pour vérifier si l'utilisateur est un ambassadeur
CREATE OR REPLACE FUNCTION public.is_ambassador()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM ambassadors 
    WHERE user_id = auth.uid() 
    AND status = 'active'
  )
$$;

-- Fonction pour récupérer l'ID de l'ambassadeur
CREATE OR REPLACE FUNCTION public.get_ambassador_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM ambassadors WHERE user_id = auth.uid() LIMIT 1
$$;

-- Ajouter une politique INSERT pour les ambassadeurs
CREATE POLICY offers_ambassador_insert ON offers
FOR INSERT TO authenticated
WITH CHECK (
  -- L'ambassadeur peut créer une offre si:
  -- 1. Il est bien un ambassadeur actif
  -- 2. Le type de l'offre est 'ambassador_offer'
  -- 3. L'ambassador_id correspond à son propre ID
  is_ambassador()
  AND type = 'ambassador_offer'
  AND ambassador_id = get_ambassador_id()
);

-- Ajouter une politique SELECT pour les ambassadeurs (voir leurs propres offres)
CREATE POLICY offers_ambassador_select ON offers
FOR SELECT TO authenticated
USING (
  -- L'ambassadeur peut voir ses propres offres
  is_ambassador()
  AND ambassador_id = get_ambassador_id()
);

-- Ajouter une politique UPDATE pour les ambassadeurs (modifier leurs propres offres)
CREATE POLICY offers_ambassador_update ON offers
FOR UPDATE TO authenticated
USING (
  is_ambassador()
  AND ambassador_id = get_ambassador_id()
)
WITH CHECK (
  is_ambassador()
  AND ambassador_id = get_ambassador_id()
);