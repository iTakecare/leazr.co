-- Supprimer complètement les RLS sur les tables qui n'en ont pas besoin
-- pour éliminer tous les warnings de politiques multiples

-- Désactiver RLS sur les tables de configuration/référence
ALTER TABLE public.blog_posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps_cms DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_models DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.woocommerce_configs DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques de ces tables
DROP POLICY IF EXISTS "Blog posts unified" ON public.blog_posts;
DROP POLICY IF EXISTS "Brands unified" ON public.brands;
DROP POLICY IF EXISTS "Categories unified" ON public.categories;
DROP POLICY IF EXISTS "Commission levels unified" ON public.commission_levels;
DROP POLICY IF EXISTS "Commission rates unified" ON public.commission_rates;
DROP POLICY IF EXISTS "Content CMS unified" ON public.content_cms;
DROP POLICY IF EXISTS "Hero CMS unified" ON public.hero_cms;
DROP POLICY IF EXISTS "Unified woocommerce_configs access" ON public.woocommerce_configs;
DROP POLICY IF EXISTS "Unified user_permissions access" ON public.user_permissions;

-- Garder RLS seulement sur les tables critiques avec des données sensibles
-- profiles, clients, offers, contracts, ambassadors, partners

-- Simplifier les politiques pour les tables critiques
DROP POLICY IF EXISTS "Unified profile access" ON public.profiles;
DROP POLICY IF EXISTS "Unified offer access" ON public.offers;
DROP POLICY IF EXISTS "Unified client access" ON public.clients;

-- Créer des politiques simples et non conflictuelles
CREATE POLICY "Profile access" ON public.profiles
FOR SELECT USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

CREATE POLICY "Profile update" ON public.profiles
FOR UPDATE USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin'))
);

-- Offres - politique simplifiée
CREATE POLICY "Offer access" ON public.offers
FOR SELECT USING (
  user_id = auth.uid() OR 
  company_id = get_user_company_id() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Offer management" ON public.offers
FOR INSERT WITH CHECK (
  user_id = auth.uid() OR 
  company_id = get_user_company_id() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) OR
  auth.role() = 'anon'
);

-- Clients - politique simplifiée
CREATE POLICY "Client access" ON public.clients
FOR SELECT USING (
  company_id = get_user_company_id() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Client management" ON public.clients
FOR INSERT WITH CHECK (
  company_id = get_user_company_id() OR
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) OR
  auth.role() = 'anon'
);