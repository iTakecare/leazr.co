-- Correction des warnings "Function Search Path Mutable" pour les 8 fonctions restantes
-- Ajouter SET search_path = 'public' pour éviter les risques de sécurité

-- 1. update_netlify_updated_at
CREATE OR REPLACE FUNCTION public.update_netlify_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. update_cloudflare_logs_updated_at 
CREATE OR REPLACE FUNCTION public.update_cloudflare_logs_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 3. update_company_domains_updated_at
CREATE OR REPLACE FUNCTION public.update_company_domains_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 4. cleanup_expired_auth_tokens
CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.custom_auth_tokens 
  WHERE expires_at < now() OR used_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

-- 5. detect_company_from_domain
CREATE OR REPLACE FUNCTION public.detect_company_from_domain(request_origin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  company_uuid UUID;
  extracted_subdomain TEXT;
BEGIN
  -- Extraire le sous-domaine depuis l'origine de la requête
  -- Ex: https://client1.leazr.co -> client1
  IF request_origin LIKE '%.leazr.co%' THEN
    extracted_subdomain := SPLIT_PART(SPLIT_PART(request_origin, '//', 2), '.', 1);
    
    -- Chercher dans la table company_domains
    SELECT company_id INTO company_uuid
    FROM public.company_domains
    WHERE subdomain = extracted_subdomain AND is_active = true
    LIMIT 1;
  END IF;
  
  -- Si pas trouvé, retourner NULL (utilisation du domaine principal)
  RETURN company_uuid;
END;
$function$;

-- 6. render_email_template
CREATE OR REPLACE FUNCTION public.render_email_template(template_content text, variables jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  result TEXT;
  var_key TEXT;
  var_value TEXT;
BEGIN
  result := template_content;
  
  -- Remplacer chaque variable dans le template
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(variables)
  LOOP
    result := REPLACE(result, '{{' || var_key || '}}', COALESCE(var_value, ''));
  END LOOP;
  
  RETURN result;
END;
$function$;

-- 7. generate_company_subdomain
CREATE OR REPLACE FUNCTION public.generate_company_subdomain(company_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  base_subdomain text;
  final_subdomain text;
  counter integer := 1;
BEGIN
  -- Nettoyer le nom de l'entreprise pour créer un sous-domaine valide
  base_subdomain := lower(regexp_replace(company_name, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Limiter à 20 caractères maximum
  base_subdomain := left(base_subdomain, 20);
  
  -- Si le nom est vide après nettoyage, utiliser un nom par défaut
  IF base_subdomain = '' OR base_subdomain IS NULL THEN
    base_subdomain := 'company';
  END IF;
  
  -- Vérifier l'unicité et ajouter un numéro si nécessaire
  final_subdomain := base_subdomain;
  
  WHILE EXISTS (SELECT 1 FROM public.company_domains WHERE subdomain = final_subdomain) LOOP
    final_subdomain := base_subdomain || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_subdomain;
END;
$function$;

-- 8. auto_create_company_domain
CREATE OR REPLACE FUNCTION public.auto_create_company_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  generated_subdomain text;
BEGIN
  -- Générer un sous-domaine unique
  generated_subdomain := public.generate_company_subdomain(NEW.name);
  
  -- Créer l'entrée dans company_domains
  INSERT INTO public.company_domains (
    company_id,
    domain,
    subdomain,
    is_active,
    is_primary
  ) VALUES (
    NEW.id,
    'leazr.co',
    generated_subdomain,
    true,
    true
  );
  
  RETURN NEW;
END;
$function$;