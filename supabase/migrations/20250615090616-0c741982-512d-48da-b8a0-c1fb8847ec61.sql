-- OPTIMISATION 3: Nettoyer les politiques RLS sur products
-- Nettoyage des politiques existantes sur products
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.products';
    END LOOP;
END $$;

-- Réactiver RLS et créer des politiques simplifiées
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- 1. Admin: accès total
CREATE POLICY "Admin full access to products" ON public.products
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 2. Multi-tenant: accès par entreprise
CREATE POLICY "Company members can manage their products" ON public.products
FOR ALL USING (
  company_id = get_user_company_id()
) WITH CHECK (
  company_id = get_user_company_id()
);

-- 3. Lecture publique des produits actifs
CREATE POLICY "Public can view active products" ON public.products
FOR SELECT USING (
  active = true AND admin_only = false
);