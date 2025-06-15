-- Corriger les politiques RLS pour éviter les multiples politiques permissives

-- Supprimer toutes les politiques problématiques et les recréer de manière optimisée

-- Commission levels - Une seule politique de lecture
DROP POLICY IF EXISTS "Public commission_levels read access" ON public.commission_levels;
DROP POLICY IF EXISTS "Admin commission_levels management" ON public.commission_levels;

CREATE POLICY "Commission levels access" ON public.commission_levels
FOR SELECT USING (true);

CREATE POLICY "Commission levels admin write" ON public.commission_levels
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Commission levels admin update" ON public.commission_levels
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Commission levels admin delete" ON public.commission_levels
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Commission rates - Une seule politique de lecture
DROP POLICY IF EXISTS "Public commission_rates read access" ON public.commission_rates;
DROP POLICY IF EXISTS "Admin commission_rates management" ON public.commission_rates;

CREATE POLICY "Commission rates access" ON public.commission_rates
FOR SELECT USING (true);

CREATE POLICY "Commission rates admin write" ON public.commission_rates
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Commission rates admin update" ON public.commission_rates
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Commission rates admin delete" ON public.commission_rates
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Content CMS
DROP POLICY IF EXISTS "Public content_cms read access" ON public.content_cms;
DROP POLICY IF EXISTS "Admin content_cms management" ON public.content_cms;

CREATE POLICY "Content CMS access" ON public.content_cms
FOR SELECT USING (true);

CREATE POLICY "Content CMS admin write" ON public.content_cms
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Content CMS admin update" ON public.content_cms
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Content CMS admin delete" ON public.content_cms
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Hero CMS
DROP POLICY IF EXISTS "Public hero_cms read access" ON public.hero_cms;
DROP POLICY IF EXISTS "Admin hero_cms management" ON public.hero_cms;

CREATE POLICY "Hero CMS access" ON public.hero_cms
FOR SELECT USING (true);

CREATE POLICY "Hero CMS admin write" ON public.hero_cms
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Hero CMS admin update" ON public.hero_cms
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Hero CMS admin delete" ON public.hero_cms
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Brands - Corriger
DROP POLICY IF EXISTS "Public brands read access" ON public.brands;
DROP POLICY IF EXISTS "Admin brands management" ON public.brands;

CREATE POLICY "Brands read access" ON public.brands
FOR SELECT USING (true);

CREATE POLICY "Brands admin write" ON public.brands
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Brands admin update" ON public.brands
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Brands admin delete" ON public.brands
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Categories - Corriger
DROP POLICY IF EXISTS "Public categories read access" ON public.categories;
DROP POLICY IF EXISTS "Admin categories management" ON public.categories;

CREATE POLICY "Categories read access" ON public.categories
FOR SELECT USING (true);

CREATE POLICY "Categories admin write" ON public.categories
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Categories admin update" ON public.categories
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Categories admin delete" ON public.categories
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Blog posts - Corriger
DROP POLICY IF EXISTS "Unified blog_posts access" ON public.blog_posts;
DROP POLICY IF EXISTS "Admin blog_posts management" ON public.blog_posts;

CREATE POLICY "Blog posts read access" ON public.blog_posts
FOR SELECT USING (is_published = true);

CREATE POLICY "Blog posts admin write" ON public.blog_posts
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Blog posts admin update" ON public.blog_posts
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Blog posts admin delete" ON public.blog_posts
FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);