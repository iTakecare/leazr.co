-- Corriger les problèmes de sécurité en réactivant RLS avec des politiques optimisées

-- Réactiver RLS sur les tables qui en ont besoin pour la sécurité
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
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pdf_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;

-- Créer des politiques de lecture publique optimisées (une seule politique SELECT par table)
CREATE POLICY "blog_posts_read" ON public.blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "brands_read" ON public.brands FOR SELECT USING (true);
CREATE POLICY "categories_read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "commission_levels_read" ON public.commission_levels FOR SELECT USING (true);
CREATE POLICY "commission_rates_read" ON public.commission_rates FOR SELECT USING (true);
CREATE POLICY "content_cms_read" ON public.content_cms FOR SELECT USING (true);
CREATE POLICY "hero_cms_read" ON public.hero_cms FOR SELECT USING (true);
CREATE POLICY "pages_cms_read" ON public.pages_cms FOR SELECT USING (is_published = true);
CREATE POLICY "menus_cms_read" ON public.menus_cms FOR SELECT USING (true);
CREATE POLICY "meta_cms_read" ON public.meta_cms FOR SELECT USING (true);
CREATE POLICY "steps_cms_read" ON public.steps_cms FOR SELECT USING (true);
CREATE POLICY "product_attributes_read" ON public.product_attributes FOR SELECT USING (true);
CREATE POLICY "product_attribute_values_read" ON public.product_attribute_values FOR SELECT USING (true);

-- Politiques d'administration pour les tables CMS/config (utiliser auth.users directement pour éviter la récursion)
CREATE POLICY "blog_posts_admin" ON public.blog_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "brands_admin" ON public.brands FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "categories_admin" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "commission_levels_admin" ON public.commission_levels FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "commission_rates_admin" ON public.commission_rates FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "content_cms_admin" ON public.content_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "hero_cms_admin" ON public.hero_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "pages_cms_admin" ON public.pages_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "menus_cms_admin" ON public.menus_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "meta_cms_admin" ON public.meta_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "steps_cms_admin" ON public.steps_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "email_templates_admin" ON public.email_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "pdf_templates_admin" ON public.pdf_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "pdf_models_admin" ON public.pdf_models FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "modules_admin" ON public.modules FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "permissions_admin" ON public.permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "permission_profiles_admin" ON public.permission_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "product_attributes_admin" ON public.product_attributes FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

CREATE POLICY "product_attribute_values_admin" ON public.product_attribute_values FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
) WITH CHECK (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);