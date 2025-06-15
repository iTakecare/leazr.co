-- Corriger toutes les politiques RLS qui référencent auth.users
-- Remplacer les vérifications admin par la fonction is_admin_optimized()

-- Créer une fonction helper pour la vérification d'admin
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Fonction pour vérifier si un utilisateur appartient à la même entreprise
CREATE OR REPLACE FUNCTION public.is_same_company(target_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND company_id = target_company_id
  );
$$;

-- Supprimer et recréer les politiques problématiques pour les tables principales
-- Table: products
DROP POLICY IF EXISTS "Company members can manage their products" ON public.products;
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Admin full access to products" ON public.products;

CREATE POLICY "Products access policy" ON public.products
FOR ALL USING (
  -- Admin peut tout voir
  public.is_company_admin() OR
  -- Membres de la même entreprise peuvent voir leurs produits
  public.is_same_company(company_id) OR
  -- Public peut voir les produits actifs non-admin
  (active = true AND (admin_only = false OR admin_only IS NULL))
) WITH CHECK (
  -- Admin peut tout modifier
  public.is_company_admin() OR
  -- Membres de la même entreprise peuvent modifier leurs produits
  public.is_same_company(company_id)
);

-- Table: product_variant_prices
DROP POLICY IF EXISTS "product_variant_prices_access" ON public.product_variant_prices;

CREATE POLICY "Product variant prices access" ON public.product_variant_prices
FOR ALL USING (
  public.is_company_admin() OR
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_variant_prices.product_id 
    AND (
      public.is_same_company(p.company_id) OR 
      (p.active = true AND (p.admin_only = false OR p.admin_only IS NULL))
    )
  )
) WITH CHECK (
  public.is_company_admin() OR
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = product_variant_prices.product_id 
    AND public.is_same_company(p.company_id)
  )
);

-- Table: brands
DROP POLICY IF EXISTS "Admin manage brands" ON public.brands;
DROP POLICY IF EXISTS "Public read brands" ON public.brands;
DROP POLICY IF EXISTS "brands_admin" ON public.brands;

CREATE POLICY "Brands access policy" ON public.brands
FOR ALL USING (true) -- Lecture publique
WITH CHECK (public.is_company_admin()); -- Seuls les admins peuvent modifier

-- Table: categories  
DROP POLICY IF EXISTS "Admin manage categories" ON public.categories;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
DROP POLICY IF EXISTS "categories_admin" ON public.categories;

CREATE POLICY "Categories access policy" ON public.categories
FOR ALL USING (true) -- Lecture publique
WITH CHECK (public.is_company_admin()); -- Seuls les admins peuvent modifier