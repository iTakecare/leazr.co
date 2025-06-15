-- Corriger en consolidant vraiment les politiques en une seule par table

-- Commission levels - UNE SEULE politique
DROP POLICY IF EXISTS "Commission levels access" ON public.commission_levels;
DROP POLICY IF EXISTS "Commission levels admin write" ON public.commission_levels;
DROP POLICY IF EXISTS "Commission levels admin update" ON public.commission_levels;
DROP POLICY IF EXISTS "Commission levels admin delete" ON public.commission_levels;

CREATE POLICY "Commission levels unified" ON public.commission_levels
FOR ALL USING (true)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Commission rates - UNE SEULE politique
DROP POLICY IF EXISTS "Commission rates access" ON public.commission_rates;
DROP POLICY IF EXISTS "Commission rates admin write" ON public.commission_rates;
DROP POLICY IF EXISTS "Commission rates admin update" ON public.commission_rates;
DROP POLICY IF EXISTS "Commission rates admin delete" ON public.commission_rates;

CREATE POLICY "Commission rates unified" ON public.commission_rates
FOR ALL USING (true)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Content CMS - UNE SEULE politique
DROP POLICY IF EXISTS "Content CMS access" ON public.content_cms;
DROP POLICY IF EXISTS "Content CMS admin write" ON public.content_cms;
DROP POLICY IF EXISTS "Content CMS admin update" ON public.content_cms;
DROP POLICY IF EXISTS "Content CMS admin delete" ON public.content_cms;

CREATE POLICY "Content CMS unified" ON public.content_cms
FOR ALL USING (true)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Hero CMS - UNE SEULE politique
DROP POLICY IF EXISTS "Hero CMS access" ON public.hero_cms;
DROP POLICY IF EXISTS "Hero CMS admin write" ON public.hero_cms;
DROP POLICY IF EXISTS "Hero CMS admin update" ON public.hero_cms;
DROP POLICY IF EXISTS "Hero CMS admin delete" ON public.hero_cms;

CREATE POLICY "Hero CMS unified" ON public.hero_cms
FOR ALL USING (true)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Brands - UNE SEULE politique
DROP POLICY IF EXISTS "Brands read access" ON public.brands;
DROP POLICY IF EXISTS "Brands admin write" ON public.brands;
DROP POLICY IF EXISTS "Brands admin update" ON public.brands;
DROP POLICY IF EXISTS "Brands admin delete" ON public.brands;

CREATE POLICY "Brands unified" ON public.brands
FOR ALL USING (true)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Categories - UNE SEULE politique
DROP POLICY IF EXISTS "Categories read access" ON public.categories;
DROP POLICY IF EXISTS "Categories admin write" ON public.categories;
DROP POLICY IF EXISTS "Categories admin update" ON public.categories;
DROP POLICY IF EXISTS "Categories admin delete" ON public.categories;

CREATE POLICY "Categories unified" ON public.categories
FOR ALL USING (true)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Blog posts - UNE SEULE politique  
DROP POLICY IF EXISTS "Blog posts read access" ON public.blog_posts;
DROP POLICY IF EXISTS "Blog posts admin write" ON public.blog_posts;
DROP POLICY IF EXISTS "Blog posts admin update" ON public.blog_posts;
DROP POLICY IF EXISTS "Blog posts admin delete" ON public.blog_posts;

CREATE POLICY "Blog posts unified" ON public.blog_posts
FOR ALL USING (is_published = true OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')))
WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);