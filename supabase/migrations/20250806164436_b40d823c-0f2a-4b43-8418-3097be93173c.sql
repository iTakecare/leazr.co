-- Fix the final remaining functions with non-standard search_path
CREATE OR REPLACE FUNCTION public.create_categories_table()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Create categories table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'categories'
  ) THEN
    CREATE TABLE public.categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      translation text NOT NULL,
      company_id uuid NOT NULL,
      created_at timestamp with time zone DEFAULT now(),
      updated_at timestamp with time zone DEFAULT now()
    );
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_company_users()
RETURNS TABLE(id uuid, email text, first_name text, last_name text, role text, company_id uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    au.email,
    p.first_name,
    p.last_name,
    p.role,
    p.company_id,
    p.created_at
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.company_id = get_user_company_id()
  ORDER BY p.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_client_associations()
RETURNS TABLE(user_id uuid, client_id uuid, association_type text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ac.ambassador_id as user_id,
    ac.client_id,
    'ambassador'::text as association_type,
    ac.created_at
  FROM public.ambassador_clients ac
  JOIN public.ambassadors a ON ac.ambassador_id = a.id
  WHERE a.user_id = auth.uid()
  
  UNION ALL
  
  SELECT 
    pc.partner_id as user_id,
    pc.client_id,
    'partner'::text as association_type,
    pc.created_at
  FROM public.partner_clients pc
  JOIN public.partners p ON pc.partner_id = p.id
  WHERE p.user_id = auth.uid();
END;
$function$;