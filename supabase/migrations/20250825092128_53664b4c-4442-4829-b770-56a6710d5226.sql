-- COMPREHENSIVE SECURITY FIXES - CORRECTED VERSION
-- Phase 1: Fix database function search paths (HIGH PRIORITY)
-- Phase 2: Restrict public access to sensitive business data (MEDIUM PRIORITY)

-- ==============================================
-- PHASE 1: DATABASE FUNCTION SECURITY FIXES
-- ==============================================

-- Fix search path mutability issues in critical functions
-- This prevents function hijacking attacks

CREATE OR REPLACE FUNCTION public.get_user_company_id_secure()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Immutable search path
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Get company_id from profiles table for current user
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_company_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_company_id_secure()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Immutable search path
AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Récupérer le company_id depuis la table profiles
  SELECT company_id INTO user_company_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  RETURN user_company_id;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner NULL
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_saas_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Immutable search path
AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get current user's email from auth.users
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  -- Check if user is SaaS admin
  RETURN user_email = 'ecommerce@itakecare.be';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Update other critical functions with immutable search paths
CREATE OR REPLACE FUNCTION public.generate_company_slug(company_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'  -- FIXED: Immutable search path
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  -- Nettoyer le nom de l'entreprise pour créer un slug valide
  base_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(base_slug, '-');
  
  -- Limiter à 50 caractères maximum
  base_slug := left(base_slug, 50);
  
  -- Si le nom est vide après nettoyage, utiliser un nom par défaut
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'company';
  END IF;
  
  -- Vérifier l'unicité et ajouter un numéro si nécessaire
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.companies WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

-- ==============================================
-- PHASE 2: RESTRICT ACCESS TO SENSITIVE DATA
-- ==============================================

-- 1. BUSINESS PROFILES - Restrict public access
DROP POLICY IF EXISTS "business_profiles_authenticated_read" ON public.business_profiles;
DROP POLICY IF EXISTS "business_profiles_admin_write" ON public.business_profiles;

-- Only authenticated users can read business profiles
CREATE POLICY "business_profiles_authenticated_read"
ON public.business_profiles
FOR SELECT
TO authenticated
USING (true);

-- Only admins can manage business profiles
CREATE POLICY "business_profiles_admin_write"
ON public.business_profiles
FOR ALL
TO authenticated
USING (is_saas_admin())
WITH CHECK (is_saas_admin());

-- 2. BLOG POSTS - Enhance content protection
DROP POLICY IF EXISTS "Blog posts unified" ON public.blog_posts;
DROP POLICY IF EXISTS "Public read blog_posts" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_public_read" ON public.blog_posts;
DROP POLICY IF EXISTS "blog_posts_read" ON public.blog_posts;

-- Public can only read published posts
CREATE POLICY "blog_posts_public_read"
ON public.blog_posts
FOR SELECT
TO public
USING (is_published = true);

-- Authenticated users can read all posts if admin
CREATE POLICY "blog_posts_admin_access"
ON public.blog_posts
FOR ALL
TO authenticated
USING (
  (is_published = true) OR 
  (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  ))
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- 3. CONTENT CMS - Restrict to authenticated admin users only
DROP POLICY IF EXISTS "Public read content_cms" ON public.content_cms;
DROP POLICY IF EXISTS "content_cms_admin_write" ON public.content_cms;
DROP POLICY IF EXISTS "content_cms_public_read" ON public.content_cms;
DROP POLICY IF EXISTS "content_cms_public_read_secure" ON public.content_cms;
DROP POLICY IF EXISTS "content_cms_read" ON public.content_cms;

-- Only allow public read for specific, safe content types
CREATE POLICY "content_cms_public_safe_read"
ON public.content_cms
FOR SELECT
TO public
USING (
  -- Only allow public access to explicitly safe content
  name IN ('homepage', 'about', 'contact', 'privacy', 'terms')
);

-- Admin full access for authenticated users
CREATE POLICY "content_cms_admin_access"
ON public.content_cms
FOR ALL
TO authenticated
USING (is_saas_admin())
WITH CHECK (is_saas_admin());