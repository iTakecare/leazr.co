-- Nettoyer toutes les politiques existantes avant de recréer

-- Supprimer toutes les politiques de la table profiles
DROP POLICY IF EXISTS "Profile access" ON public.profiles;
DROP POLICY IF EXISTS "Profile update" ON public.profiles;
DROP POLICY IF EXISTS "Unified profile access" ON public.profiles;
DROP POLICY IF EXISTS "profiles_access" ON public.profiles;

-- Supprimer toutes les politiques de la table offers
DROP POLICY IF EXISTS "Offer management" ON public.offers;
DROP POLICY IF EXISTS "Unified offer access" ON public.offers;
DROP POLICY IF EXISTS "offers_access" ON public.offers;

-- Supprimer toutes les politiques de la table clients
DROP POLICY IF EXISTS "Client management" ON public.clients;
DROP POLICY IF EXISTS "Unified client access" ON public.clients;
DROP POLICY IF EXISTS "clients_access" ON public.clients;

-- Supprimer toutes les politiques de la table products
DROP POLICY IF EXISTS "Product access" ON public.products;
DROP POLICY IF EXISTS "Product management" ON public.products;
DROP POLICY IF EXISTS "Product update" ON public.products;
DROP POLICY IF EXISTS "Product delete" ON public.products;
DROP POLICY IF EXISTS "products_access" ON public.products;

-- Désactiver RLS sur les tables de configuration
ALTER TABLE public.blog_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values DISABLE ROW LEVEL SECURITY;

-- Recréer des politiques optimisées pour les tables critiques seulement

-- Table profiles - UNE SEULE politique FOR ALL
CREATE POLICY "profile_access" ON public.profiles
FOR ALL USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Table offers - UNE SEULE politique FOR ALL  
CREATE POLICY "offer_access" ON public.offers
FOR ALL USING (
  user_id = auth.uid() OR
  company_id = get_user_company_id() OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')) OR
  auth.role() = 'anon'
);

-- Table clients - UNE SEULE politique FOR ALL
CREATE POLICY "client_access" ON public.clients
FOR ALL USING (
  user_id = auth.uid() OR
  company_id = get_user_company_id() OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')) OR
  auth.role() = 'anon'
);

-- Table products - UNE SEULE politique FOR ALL
CREATE POLICY "product_access" ON public.products
FOR ALL USING (
  active = true OR
  company_id = get_user_company_id() OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);