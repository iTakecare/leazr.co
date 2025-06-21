
-- Étape 1: Nettoyer complètement toutes les politiques RLS existantes
DROP POLICY IF EXISTS "Ambassador client relationships access" ON public.ambassador_clients;
DROP POLICY IF EXISTS "Ambassador client access" ON public.clients;
DROP POLICY IF EXISTS "Ambassador client creation" ON public.clients;
DROP POLICY IF EXISTS "Ambassador client updates" ON public.clients;
DROP POLICY IF EXISTS "Ambassador client deletion" ON public.clients;
DROP POLICY IF EXISTS "Ambassador profile access" ON public.ambassadors;
DROP POLICY IF EXISTS "Ambassador profile updates" ON public.ambassadors;
DROP POLICY IF EXISTS "Company branding access" ON public.companies;

-- Supprimer toutes les autres politiques qui pourraient interférer
DROP POLICY IF EXISTS "client_access" ON public.clients;
DROP POLICY IF EXISTS "offer_access" ON public.offers;
DROP POLICY IF EXISTS "profile_access" ON public.profiles;
DROP POLICY IF EXISTS "product_access" ON public.products;
DROP POLICY IF EXISTS "profiles_own_access" ON public.profiles;
DROP POLICY IF EXISTS "ambassadors_manage_client_relationships" ON public.ambassador_clients;
DROP POLICY IF EXISTS "ambassadors_view_assigned_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_create_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_update_assigned_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_delete_assigned_clients" ON public.clients;
DROP POLICY IF EXISTS "ambassadors_view_own_profile" ON public.ambassadors;
DROP POLICY IF EXISTS "ambassadors_update_own_profile" ON public.ambassadors;
DROP POLICY IF EXISTS "companies_public_branding_access" ON public.companies;
DROP POLICY IF EXISTS "offers_user_access" ON public.offers;
DROP POLICY IF EXISTS "products_public_access" ON public.products;
DROP POLICY IF EXISTS "products_admin_manage" ON public.products;

-- Étape 2: S'assurer que RLS est activé sur toutes les tables nécessaires
ALTER TABLE public.ambassador_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Étape 3: Ajouter les colonnes manquantes pour le branding
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS primary_color text,
ADD COLUMN IF NOT EXISTS secondary_color text,
ADD COLUMN IF NOT EXISTS accent_color text,
ADD COLUMN IF NOT EXISTS favicon_url text,
ADD COLUMN IF NOT EXISTS custom_domain text;

-- Étape 4: Créer des politiques RLS simplifiées et efficaces

-- Politique pour ambassador_clients - permet aux ambassadeurs de gérer leurs relations clients
CREATE POLICY "ambassadors_manage_client_relationships" 
ON public.ambassador_clients
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ambassadors 
    WHERE id = ambassador_clients.ambassador_id 
    AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ambassadors 
    WHERE id = ambassador_clients.ambassador_id 
    AND user_id = auth.uid()
  )
);

-- Politiques pour clients - accès des ambassadeurs
CREATE POLICY "ambassadors_view_assigned_clients" 
ON public.clients
FOR SELECT 
TO authenticated
USING (
  -- Clients directement assignés via ambassador_clients
  EXISTS (
    SELECT 1 FROM public.ambassador_clients ac
    JOIN public.ambassadors a ON ac.ambassador_id = a.id
    WHERE ac.client_id = clients.id
    AND a.user_id = auth.uid()
  )
  OR
  -- Accès admin complet
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "ambassadors_create_clients" 
ON public.clients
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.ambassadors 
    WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "ambassadors_update_assigned_clients" 
ON public.clients
FOR UPDATE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ambassador_clients ac
    JOIN public.ambassadors a ON ac.ambassador_id = a.id
    WHERE ac.client_id = clients.id
    AND a.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "ambassadors_delete_assigned_clients" 
ON public.clients
FOR DELETE 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.ambassador_clients ac
    JOIN public.ambassadors a ON ac.ambassador_id = a.id
    WHERE ac.client_id = clients.id
    AND a.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Politiques pour ambassadors
CREATE POLICY "ambassadors_view_own_profile" 
ON public.ambassadors
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "ambassadors_update_own_profile" 
ON public.ambassadors
FOR UPDATE 
TO authenticated
USING (
  user_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Politique pour companies - accès au branding
CREATE POLICY "companies_public_branding_access" 
ON public.companies
FOR SELECT 
TO authenticated
USING (true);

-- Politiques pour profiles - CORRECTION DE LA RÉCURSION
CREATE POLICY "profiles_own_access" 
ON public.profiles
FOR ALL 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_admin_access" 
ON public.profiles
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  )
);

-- Politiques pour offers
CREATE POLICY "offers_user_access" 
ON public.offers
FOR ALL 
TO authenticated
USING (
  user_id = auth.uid()
  OR
  ambassador_id IN (
    SELECT id FROM public.ambassadors WHERE user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  )
);

-- Politiques pour products
CREATE POLICY "products_public_access" 
ON public.products
FOR SELECT 
TO authenticated
USING (
  active = true
  OR
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  )
);

CREATE POLICY "products_admin_manage" 
ON public.products
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')
  )
);
