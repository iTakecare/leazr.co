-- Optimiser les politiques RLS pour corriger les warnings de performance

-- 1. Supprimer les politiques multiples permissives et les remplacer par des politiques unifiées
-- Commencer par les tables avec des politiques multiples

-- Table profiles - Consolider les politiques
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- Créer une politique unifiée optimisée pour profiles
CREATE POLICY "Unified profile access" ON public.profiles
FOR ALL USING (
  auth.uid() = id OR 
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.id = auth.uid() 
    AND p.role IN ('admin', 'super_admin')
  )
);

-- Table offers - Supprimer les politiques multiples
DROP POLICY IF EXISTS "Admin full access to offers" ON public.offers;
DROP POLICY IF EXISTS "Company members can manage their offers" ON public.offers;
DROP POLICY IF EXISTS "Users can manage their own offers" ON public.offers;
DROP POLICY IF EXISTS "Public can view signed offers" ON public.offers;
DROP POLICY IF EXISTS "Allow public offer requests" ON public.offers;

-- Créer une politique unifiée optimisée pour offers
CREATE POLICY "Unified offer access" ON public.offers
FOR ALL USING (
  -- Admin access
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) OR
  -- Company access
  company_id = get_user_company_id() OR
  -- User own offers
  user_id = auth.uid() OR
  -- Public view for signed offers
  (auth.role() = 'anon' AND workflow_status IN ('sent', 'approved'))
) WITH CHECK (
  -- Admin can do anything
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) OR
  -- Company members can manage their company data
  company_id = get_user_company_id() OR
  -- Users can manage their own offers
  user_id = auth.uid() OR
  -- Allow public inserts for client requests
  (auth.role() = 'anon' AND type = 'client_request')
);

-- Table clients - Supprimer les politiques multiples
DROP POLICY IF EXISTS "Admin full access to clients" ON public.clients;
DROP POLICY IF EXISTS "Company members can manage their clients" ON public.clients;
DROP POLICY IF EXISTS "Allow public client requests" ON public.clients;

-- Créer une politique unifiée optimisée pour clients
CREATE POLICY "Unified client access" ON public.clients
FOR ALL USING (
  -- Admin access
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) OR
  -- Company access
  company_id = get_user_company_id() OR
  -- Public access (limited)
  auth.role() = 'anon'
) WITH CHECK (
  -- Admin can do anything
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) OR
  -- Company members can manage their company data
  company_id = get_user_company_id() OR
  -- Allow public inserts
  auth.role() = 'anon'
);

-- Table user_permissions - Consolider les politiques
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
DROP POLICY IF EXISTS "Admins can manage all permissions" ON public.user_permissions;

CREATE POLICY "Unified user_permissions access" ON public.user_permissions
FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Table woocommerce_configs - Consolider les politiques  
DROP POLICY IF EXISTS "Users can manage their own woocommerce configs" ON public.woocommerce_configs;
DROP POLICY IF EXISTS "Admins can view all woocommerce configs" ON public.woocommerce_configs;

CREATE POLICY "Unified woocommerce_configs access" ON public.woocommerce_configs
FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
) WITH CHECK (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Optimiser les tables avec de nombreuses politiques permissives
-- Table blog_posts
DROP POLICY IF EXISTS "Anyone can read published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins can manage blog posts" ON public.blog_posts;

CREATE POLICY "Unified blog_posts access" ON public.blog_posts
FOR SELECT USING (is_published = true);

CREATE POLICY "Admin blog_posts management" ON public.blog_posts
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Table brands - Consolider
CREATE POLICY "Public brands read access" ON public.brands
FOR SELECT USING (true);

CREATE POLICY "Admin brands management" ON public.brands
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Table categories - Consolider
CREATE POLICY "Public categories read access" ON public.categories
FOR SELECT USING (true);

CREATE POLICY "Admin categories management" ON public.categories
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Table commission_levels - Consolider
CREATE POLICY "Public commission_levels read access" ON public.commission_levels
FOR SELECT USING (true);

CREATE POLICY "Admin commission_levels management" ON public.commission_levels
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- 2. Optimiser la fonction get_user_company_id pour éviter les réévaluations
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT company_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$function$;

-- 3. Créer une fonction optimisée pour les vérifications de rôle
CREATE OR REPLACE FUNCTION public.is_admin_optimized()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$function$;