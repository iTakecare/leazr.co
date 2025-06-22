
-- Vérifier et corriger les politiques RLS pour la table offers
-- D'abord, supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Admin full access to offers" ON public.offers;
DROP POLICY IF EXISTS "Company members can manage their offers" ON public.offers;
DROP POLICY IF EXISTS "Users can manage their own offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view signed offers" ON public.offers;
DROP POLICY IF EXISTS "offers_company_access" ON public.offers;
DROP POLICY IF EXISTS "offers_public_view" ON public.offers;

-- Désactiver RLS temporairement pour nettoyer
ALTER TABLE public.offers DISABLE ROW LEVEL SECURITY;

-- Réactiver RLS
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS simplifiées et fonctionnelles
-- 1. Admin: accès total
CREATE POLICY "offers_admin_access" ON public.offers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- 2. Multi-tenant: accès par entreprise (SELECT, UPDATE, DELETE)
CREATE POLICY "offers_company_select" ON public.offers
FOR SELECT USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "offers_company_update" ON public.offers
FOR UPDATE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "offers_company_delete" ON public.offers
FOR DELETE USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- 3. INSERT: permettre l'insertion si l'utilisateur appartient à la même entreprise
CREATE POLICY "offers_company_insert" ON public.offers
FOR INSERT WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

-- 4. Accès pour les utilisateurs propriétaires (SELECT, UPDATE, DELETE)
CREATE POLICY "offers_user_select" ON public.offers
FOR SELECT USING (
  user_id = auth.uid()
);

CREATE POLICY "offers_user_update" ON public.offers
FOR UPDATE USING (
  user_id = auth.uid()
);

CREATE POLICY "offers_user_delete" ON public.offers
FOR DELETE USING (
  user_id = auth.uid()
);

-- 5. INSERT: permettre l'insertion pour ses propres offres
CREATE POLICY "offers_user_insert" ON public.offers
FOR INSERT WITH CHECK (
  user_id = auth.uid()
);

-- 6. Lecture publique pour les offres signées (sans authentification)
CREATE POLICY "offers_public_view" ON public.offers
FOR SELECT USING (
  workflow_status IN ('sent', 'approved')
);
