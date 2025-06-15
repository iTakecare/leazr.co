-- Réactiver RLS sur les tables de configuration importantes
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_cms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hero_cms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pages_cms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menus_cms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_cms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.steps_cms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;

-- Politique pour table profiles - UNE SEULE politique FOR ALL
CREATE POLICY "profile_access" ON public.profiles
FOR ALL USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour table offers - UNE SEULE politique FOR ALL  
CREATE POLICY "offer_access" ON public.offers
FOR ALL USING (
  user_id = auth.uid() OR
  company_id = get_user_company_id() OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')) OR
  auth.role() = 'anon'
);

-- Politique pour table clients - UNE SEULE politique FOR ALL
CREATE POLICY "client_access" ON public.clients
FOR ALL USING (
  user_id = auth.uid() OR
  company_id = get_user_company_id() OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')) OR
  auth.role() = 'anon'
);

-- Politique pour table products - UNE SEULE politique FOR ALL
CREATE POLICY "product_access" ON public.products
FOR ALL USING (
  active = true OR
  company_id = get_user_company_id() OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);