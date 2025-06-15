-- OPTIMISATION 2: Nettoyer les politiques RLS redondantes sur offers
-- Supprimer toutes les politiques existantes sur offers
DROP POLICY IF EXISTS "Admin peut modifier toutes les offres" ON public.offers;
DROP POLICY IF EXISTS "Admin peut voir toutes les offres" ON public.offers;
DROP POLICY IF EXISTS "Allow authenticated users to manage their offers" ON public.offers;
DROP POLICY IF EXISTS "Allow public offer insertion" ON public.offers;
DROP POLICY IF EXISTS "Allow public to create requests" ON public.offers;
DROP POLICY IF EXISTS "Allow public to insert offers" ON public.offers;
DROP POLICY IF EXISTS "Autoriser les insertions publiques pour offers" ON public.offers;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.offers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.offers;
DROP POLICY IF EXISTS "Enable public inserts to offers" ON public.offers;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON public.offers;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.offers;
DROP POLICY IF EXISTS "Les partners peuvent créer des offres" ON public.offers;
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs propres offres" ON public.offers;
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs propres offres" ON public.offers;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres offres" ON public.offers;
DROP POLICY IF EXISTS "Users can manage offers from their company" ON public.offers;
DROP POLICY IF EXISTS "Users can only access their company data" ON public.offers;
DROP POLICY IF EXISTS "Users can only delete offers from their company" ON public.offers;
DROP POLICY IF EXISTS "Users can only insert offers in their company" ON public.offers;
DROP POLICY IF EXISTS "Users can only see offers from their company" ON public.offers;
DROP POLICY IF EXISTS "Users can only update offers from their company" ON public.offers;
DROP POLICY IF EXISTS "Users can view offers from their company" ON public.offers;
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs propres offres" ON public.offers;

-- Activer RLS sur offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Créer des politiques RLS simplifiées et optimisées pour offers
-- 1. Admin: accès total
CREATE POLICY "Admin full access to offers" ON public.offers
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 2. Multi-tenant: accès par entreprise
CREATE POLICY "Company members can manage their offers" ON public.offers
FOR ALL USING (
  company_id = get_user_company_id()
) WITH CHECK (
  company_id = get_user_company_id()
);

-- 3. Utilisateurs propriétaires
CREATE POLICY "Users can manage their own offers" ON public.offers
FOR ALL USING (
  user_id = auth.uid()
) WITH CHECK (
  user_id = auth.uid()
);

-- 4. Insertion publique pour les demandes clients
CREATE POLICY "Allow public offer requests" ON public.offers
FOR INSERT WITH CHECK (
  auth.role() = 'anon' AND type = 'client_request'
);