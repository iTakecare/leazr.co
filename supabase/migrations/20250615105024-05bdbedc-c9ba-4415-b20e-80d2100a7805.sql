-- Politiques pour les tables de configuration - Lecture publique + Admin pour écriture

-- Blog posts
CREATE POLICY "Public read blog_posts" ON public.blog_posts FOR SELECT USING (is_published = true);
CREATE POLICY "Admin manage blog_posts" ON public.blog_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Brands
CREATE POLICY "Public read brands" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admin manage brands" ON public.brands FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Categories
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Commission levels
CREATE POLICY "Public read commission_levels" ON public.commission_levels FOR SELECT USING (true);
CREATE POLICY "Admin manage commission_levels" ON public.commission_levels FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Commission rates
CREATE POLICY "Public read commission_rates" ON public.commission_rates FOR SELECT USING (true);
CREATE POLICY "Admin manage commission_rates" ON public.commission_rates FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Content CMS
CREATE POLICY "Public read content_cms" ON public.content_cms FOR SELECT USING (true);
CREATE POLICY "Admin manage content_cms" ON public.content_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Hero CMS
CREATE POLICY "Public read hero_cms" ON public.hero_cms FOR SELECT USING (true);
CREATE POLICY "Admin manage hero_cms" ON public.hero_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Pages CMS
CREATE POLICY "Public read pages_cms" ON public.pages_cms FOR SELECT USING (is_published = true);
CREATE POLICY "Admin manage pages_cms" ON public.pages_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Menus CMS
CREATE POLICY "Public read menus_cms" ON public.menus_cms FOR SELECT USING (true);
CREATE POLICY "Admin manage menus_cms" ON public.menus_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Meta CMS
CREATE POLICY "Public read meta_cms" ON public.meta_cms FOR SELECT USING (true);
CREATE POLICY "Admin manage meta_cms" ON public.meta_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Steps CMS
CREATE POLICY "Public read steps_cms" ON public.steps_cms FOR SELECT USING (true);
CREATE POLICY "Admin manage steps_cms" ON public.steps_cms FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Site settings
CREATE POLICY "Public read site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admin manage site_settings" ON public.site_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- SMTP settings (admin only)
CREATE POLICY "Admin only smtp_settings" ON public.smtp_settings FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Email templates
CREATE POLICY "Public read email_templates" ON public.email_templates FOR SELECT USING (active = true);
CREATE POLICY "Admin manage email_templates" ON public.email_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- PDF templates
CREATE POLICY "Public read pdf_templates" ON public.pdf_templates FOR SELECT USING (true);
CREATE POLICY "Admin manage pdf_templates" ON public.pdf_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- PDF models
CREATE POLICY "Public read pdf_models" ON public.pdf_models FOR SELECT USING (true);
CREATE POLICY "Admin manage pdf_models" ON public.pdf_models FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Modules
CREATE POLICY "Public read modules" ON public.modules FOR SELECT USING (true);
CREATE POLICY "Admin manage modules" ON public.modules FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Permissions (admin only)
CREATE POLICY "Admin only permissions" ON public.permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Permission profiles (admin only)
CREATE POLICY "Admin only permission_profiles" ON public.permission_profiles FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Product attributes
CREATE POLICY "Public read product_attributes" ON public.product_attributes FOR SELECT USING (true);
CREATE POLICY "Admin manage product_attributes" ON public.product_attributes FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Product attribute values
CREATE POLICY "Public read product_attribute_values" ON public.product_attribute_values FOR SELECT USING (true);
CREATE POLICY "Admin manage product_attribute_values" ON public.product_attribute_values FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);