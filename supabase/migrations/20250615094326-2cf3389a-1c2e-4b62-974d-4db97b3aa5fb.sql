-- Corriger les dernières fonctions restantes pour les warnings du Security Advisor

-- 26. Fonction get_brands
CREATE OR REPLACE FUNCTION public.get_brands()
 RETURNS SETOF brands
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT * FROM public.brands ORDER BY name ASC;
$function$;

-- 27. Fonction add_brand
CREATE OR REPLACE FUNCTION public.add_brand(brand_name text, brand_translation text)
 RETURNS brands
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  new_brand public.brands;
BEGIN
  INSERT INTO public.brands (name, translation)
  VALUES (brand_name, brand_translation)
  RETURNING * INTO new_brand;
  
  RETURN new_brand;
END;
$function$;

-- 28. Fonction update_brand
CREATE OR REPLACE FUNCTION public.update_brand(original_name text, new_name text, new_translation text)
 RETURNS brands
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  updated_brand public.brands;
BEGIN
  UPDATE public.brands
  SET 
    name = new_name,
    translation = new_translation,
    updated_at = now()
  WHERE name = original_name
  RETURNING * INTO updated_brand;
  
  RETURN updated_brand;
END;
$function$;

-- 29. Fonction delete_brand
CREATE OR REPLACE FUNCTION public.delete_brand(brand_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  DELETE FROM public.brands WHERE name = brand_name;
  RETURN FOUND;
END;
$function$;

-- 30. Fonction get_pdf_templates
CREATE OR REPLACE FUNCTION public.get_pdf_templates()
 RETURNS SETOF pdf_templates
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT * FROM public.pdf_templates ORDER BY name ASC;
$function$;

-- 31. Fonction find_duplicate_client_emails
CREATE OR REPLACE FUNCTION public.find_duplicate_client_emails()
 RETURNS SETOF text
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT email
  FROM public.clients
  WHERE email IS NOT NULL AND email != ''
  GROUP BY email
  HAVING COUNT(*) > 1;
$function$;

-- 32. Fonction link_user_to_client_on_signup
CREATE OR REPLACE FUNCTION public.link_user_to_client_on_signup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  client_record RECORD;
BEGIN
  SELECT * INTO client_record 
  FROM public.clients 
  WHERE email = NEW.email AND (user_id IS NULL OR user_id = NEW.id)
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF FOUND THEN
    UPDATE public.clients 
    SET 
      user_id = NEW.id,
      has_user_account = TRUE,
      user_account_created_at = NOW(),
      status = COALESCE(status, 'active')
    WHERE id = client_record.id;
    
    RAISE NOTICE 'Client % associé à l''utilisateur %', client_record.id, NEW.id;
  ELSE
    RAISE NOTICE 'Aucun client non associé trouvé pour l''email %', NEW.email;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 33. Fonction get_user_client_associations
CREATE OR REPLACE FUNCTION public.get_user_client_associations()
 RETURNS TABLE(user_id uuid, user_email text, user_role text, client_id uuid, client_name text, client_email text, association_date timestamp with time zone, status text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
  SELECT 
    p.id AS user_id,
    au.email AS user_email,
    p.role AS user_role,
    c.id AS client_id,
    c.name AS client_name,
    c.email AS client_email,
    c.user_account_created_at AS association_date,
    c.status
  FROM 
    auth.users au
    JOIN public.profiles p ON au.id = p.id
    LEFT JOIN public.clients c ON au.id = c.user_id
  ORDER BY c.user_account_created_at DESC NULLS LAST;
$function$;