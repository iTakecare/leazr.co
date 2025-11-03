-- Migration 1 (Corrigée): Corriger les RLS Policies pour utiliser has_role()
-- Seulement les tables qui existent réellement

-- 1. Corriger blog_posts policies
DROP POLICY IF EXISTS "blog_posts_admin_access" ON public.blog_posts;
CREATE POLICY "blog_posts_admin_access" ON public.blog_posts
FOR ALL
USING (
  is_published = true 
  OR has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
);

-- 2. Corriger offer_upload_links policies  
DROP POLICY IF EXISTS "Admins can manage upload links" ON public.offer_upload_links;
CREATE POLICY "Admins can manage upload links" ON public.offer_upload_links
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
  OR offer_id IN (
    SELECT o.id FROM public.offers o
    WHERE o.company_id = get_user_company_id()
  )
);

-- 3. Corriger storage.objects policy pour offer-documents
DROP POLICY IF EXISTS "Allow document access to authorized users" ON storage.objects;
CREATE POLICY "Allow document access to authorized users" ON storage.objects
FOR SELECT
USING (
  bucket_id = 'offer-documents'
  AND (
    has_role(auth.uid(), 'admin'::public.app_role)
    OR has_role(auth.uid(), 'super_admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.company_id = get_user_company_id()
      AND name LIKE 'offer-' || o.id::text || '/%'
    )
  )
);