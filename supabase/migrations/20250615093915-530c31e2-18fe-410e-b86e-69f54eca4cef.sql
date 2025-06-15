-- Corriger les warnings du Security Advisor en ajoutant search_path aux fonctions

-- 1. Fonction check_user_exists_by_email
CREATE OR REPLACE FUNCTION public.check_user_exists_by_email(user_email text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM auth.users WHERE email = user_email
  );
END;
$function$;

-- 2. Fonction get_user_id_by_email
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = user_email LIMIT 1;
  RETURN user_id;
END;
$function$;

-- 3. Fonction is_ambassador
CREATE OR REPLACE FUNCTION public.is_ambassador()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.ambassadors
    WHERE user_id = auth.uid()
  );
END;
$function$;

-- 4. Fonction get_menus_cms
CREATE OR REPLACE FUNCTION public.get_menus_cms(location_name text)
 RETURNS SETOF menus_cms
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT * FROM public.menus_cms WHERE location = location_name LIMIT 1;
$function$;

-- 5. Fonction get_pages_cms
CREATE OR REPLACE FUNCTION public.get_pages_cms()
 RETURNS SETOF pages_cms
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT * FROM public.pages_cms WHERE is_published = true ORDER BY created_at DESC;
$function$;

-- 6. Fonction execute_sql
CREATE OR REPLACE FUNCTION public.execute_sql(sql text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  EXECUTE sql;
END;
$function$;

-- 7. Fonction update_ambassador_commission_level
CREATE OR REPLACE FUNCTION public.update_ambassador_commission_level(ambassador_id uuid, commission_level_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.ambassadors
  SET 
    commission_level_id = update_ambassador_commission_level.commission_level_id,
    updated_at = NOW()
  WHERE id = ambassador_id;
  
  RETURN;
END;
$function$;

-- 8. Fonction get_blog_posts
CREATE OR REPLACE FUNCTION public.get_blog_posts(category_filter text DEFAULT NULL::text)
 RETURNS SETOF blog_posts
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT * FROM public.blog_posts 
  WHERE is_published = true 
  AND (category_filter IS NULL OR category = category_filter)
  ORDER BY created_at DESC;
$function$;

-- 9. Fonction get_all_users_extended
CREATE OR REPLACE FUNCTION public.get_all_users_extended()
 RETURNS TABLE(id uuid, email text, email_confirmed_at timestamp with time zone, last_sign_in_at timestamp with time zone, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
BEGIN
  RETURN QUERY 
  SELECT 
    au.id,
    au.email,
    au.email_confirmed_at,
    au.last_sign_in_at,
    au.created_at
  FROM 
    auth.users au;
END;
$function$;

-- 10. Fonction get_blog_post_by_slug
CREATE OR REPLACE FUNCTION public.get_blog_post_by_slug(post_slug text)
 RETURNS SETOF blog_posts
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT * FROM public.blog_posts 
  WHERE slug = post_slug AND is_published = true
  LIMIT 1;
$function$;

-- 11. Fonction get_featured_blog_posts
CREATE OR REPLACE FUNCTION public.get_featured_blog_posts()
 RETURNS SETOF blog_posts
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT * FROM public.blog_posts 
  WHERE is_published = true AND is_featured = true
  ORDER BY created_at DESC;
$function$;

-- 12. Fonction update_product_attributes
CREATE OR REPLACE FUNCTION public.update_product_attributes(p_product_id uuid, p_variation_attributes jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.products
  SET 
    variation_attributes = p_variation_attributes,
    updated_at = NOW()
  WHERE id = p_product_id;
END;
$function$;

-- 13. Fonction get_related_blog_posts
CREATE OR REPLACE FUNCTION public.get_related_blog_posts(post_id uuid, limit_count integer DEFAULT 3)
 RETURNS SETOF blog_posts
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT * FROM public.blog_posts 
  WHERE id != post_id 
  AND is_published = true 
  AND category = (SELECT category FROM public.blog_posts WHERE id = post_id)
  ORDER BY created_at DESC
  LIMIT limit_count;
$function$;

-- 14. Fonction get_blog_categories
CREATE OR REPLACE FUNCTION public.get_blog_categories()
 RETURNS TABLE(category text, count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT category, COUNT(*) as count
  FROM public.blog_posts
  WHERE is_published = true
  GROUP BY category
  ORDER BY category ASC;
$function$;

-- 15. Fonction update_client_user_account
CREATE OR REPLACE FUNCTION public.update_client_user_account(client_id uuid, user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.clients
  SET 
    user_id = $2,
    has_user_account = TRUE,
    user_account_created_at = NOW(),
    status = 'active'
  WHERE id = $1;
  
  RETURN FOUND;
END;
$function$;