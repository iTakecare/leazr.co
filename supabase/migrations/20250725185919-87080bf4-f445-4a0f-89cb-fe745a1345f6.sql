-- Ultimate fix: Let's update ALL remaining major security definer functions
-- This should address the last 3 warnings

-- Storage and bucket functions
CREATE OR REPLACE FUNCTION public.create_storage_bucket(bucket_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'storage'
AS $function$
BEGIN
  -- Créer le bucket s'il n'existe pas
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = bucket_name) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES (bucket_name, bucket_name, true);
  END IF;
  
  -- Créer les politiques d'accès public
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_select',
    'TRUE',
    bucket_name,
    '{SELECT}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_insert',
    'TRUE',
    bucket_name,
    '{INSERT}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_update',
    'TRUE',
    bucket_name,
    '{UPDATE}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
  
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    bucket_name || '_public_delete',
    'TRUE',
    bucket_name,
    '{DELETE}'
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_storage_policy(bucket_name text, policy_name text, definition text, policy_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'storage'
AS $function$
BEGIN
  -- Convertir le type de politique en tableau d'opérations
  -- policy_type peut être 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  INSERT INTO storage.policies (name, definition, bucket_id, operations)
  VALUES (
    policy_name,
    definition,
    bucket_name,
    ARRAY[policy_type]::text[]
  ) ON CONFLICT (name, bucket_id) DO NOTHING;
END;
$function$;

-- Blog and content functions
CREATE OR REPLACE FUNCTION public.get_blog_posts(category_filter text DEFAULT NULL::text)
 RETURNS SETOF blog_posts
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT * FROM public.blog_posts 
  WHERE is_published = true 
  AND (category_filter IS NULL OR category = category_filter)
  ORDER BY created_at DESC;
$function$;