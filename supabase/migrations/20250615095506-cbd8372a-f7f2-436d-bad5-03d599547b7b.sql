-- Corriger les fonctions restantes avec les plus grands warnings du Security Advisor

-- 1. Fonction get_company_dashboard_metrics - correction SET search_path
CREATE OR REPLACE FUNCTION public.get_company_dashboard_metrics(p_company_id uuid, time_filter text DEFAULT 'month'::text)
 RETURNS TABLE(total_revenue numeric, total_clients bigint, total_offers bigint, total_contracts bigint, pending_offers bigint, active_contracts bigint, monthly_growth_revenue numeric, monthly_growth_clients numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  time_constraint TEXT;
  prev_period_start DATE;
  prev_period_end DATE;
  current_period_start DATE;
BEGIN
  -- Déterminer les contraintes de temps
  CASE time_filter
    WHEN 'week' THEN 
      time_constraint := 'created_at >= date_trunc(''week'', now())';
      current_period_start := date_trunc('week', now())::date;
      prev_period_start := (date_trunc('week', now()) - interval '1 week')::date;
      prev_period_end := (date_trunc('week', now()) - interval '1 day')::date;
    WHEN 'month' THEN 
      time_constraint := 'created_at >= date_trunc(''month'', now())';
      current_period_start := date_trunc('month', now())::date;
      prev_period_start := (date_trunc('month', now()) - interval '1 month')::date;
      prev_period_end := (date_trunc('month', now()) - interval '1 day')::date;
    WHEN 'quarter' THEN 
      time_constraint := 'created_at >= date_trunc(''quarter'', now())';
      current_period_start := date_trunc('quarter', now())::date;
      prev_period_start := (date_trunc('quarter', now()) - interval '3 months')::date;
      prev_period_end := (date_trunc('quarter', now()) - interval '1 day')::date;
    WHEN 'year' THEN 
      time_constraint := 'created_at >= date_trunc(''year'', now())';
      current_period_start := date_trunc('year', now())::date;
      prev_period_start := (date_trunc('year', now()) - interval '1 year')::date;
      prev_period_end := (date_trunc('year', now()) - interval '1 day')::date;
    ELSE 
      time_constraint := 'TRUE';
      current_period_start := '1900-01-01'::date;
      prev_period_start := '1900-01-01'::date;
      prev_period_end := '1900-01-01'::date;
  END CASE;

  RETURN QUERY EXECUTE format('
    WITH current_metrics AS (
      SELECT 
        COALESCE(SUM(c.monthly_payment), 0) AS revenue,
        (SELECT COUNT(*) FROM public.clients WHERE company_id = %L AND %s) AS clients,
        (SELECT COUNT(*) FROM public.offers WHERE company_id = %L AND %s) AS offers,
        (SELECT COUNT(*) FROM public.contracts WHERE company_id = %L AND %s) AS contracts,
        (SELECT COUNT(*) FROM public.offers WHERE company_id = %L AND status = ''pending'') AS pending,
        (SELECT COUNT(*) FROM public.contracts WHERE company_id = %L AND status = ''active'') AS active
      FROM public.contracts c
      WHERE c.company_id = %L AND %s
    ),
    previous_revenue AS (
      SELECT COALESCE(SUM(monthly_payment), 0) AS prev_revenue
      FROM public.contracts
      WHERE company_id = %L 
        AND created_at >= %L 
        AND created_at <= %L
    ),
    previous_clients AS (
      SELECT COUNT(*) AS prev_clients
      FROM public.clients
      WHERE company_id = %L 
        AND created_at >= %L 
        AND created_at <= %L
    )
    SELECT 
      cm.revenue,
      cm.clients,
      cm.offers,
      cm.contracts,
      cm.pending,
      cm.active,
      CASE 
        WHEN pr.prev_revenue > 0 THEN 
          ((cm.revenue - pr.prev_revenue) / pr.prev_revenue * 100)
        ELSE 0 
      END AS monthly_growth_revenue,
      CASE 
        WHEN pc.prev_clients > 0 THEN 
          ((cm.clients - pc.prev_clients)::numeric / pc.prev_clients * 100)
        ELSE 0 
      END AS monthly_growth_clients
    FROM current_metrics cm, previous_revenue pr, previous_clients pc
  ', 
  p_company_id, time_constraint,
  p_company_id, time_constraint,
  p_company_id, time_constraint,
  p_company_id,
  p_company_id,
  p_company_id, time_constraint,
  p_company_id, prev_period_start, prev_period_end,
  p_company_id, prev_period_start, prev_period_end);
END;
$function$;

-- 2. Fonction group_products_by_sku - correction SET search_path
CREATE OR REPLACE FUNCTION public.group_products_by_sku()
 RETURNS TABLE(parent_id uuid, parent_name text, parent_sku text, variants_count bigint, variation_attributes jsonb)
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  product_record RECORD;
  sku_pattern text;
  base_sku text;
  variant_attributes jsonb;
  variant_values jsonb;
  variants_count bigint;
BEGIN
  -- Pour chaque produit qui a un SKU
  FOR product_record IN 
    SELECT id, name, sku 
    FROM public.products 
    WHERE sku IS NOT NULL AND sku != ''
  LOOP
    -- Extraire la partie base du SKU (avant le dernier tiret ou point)
    base_sku := regexp_replace(product_record.sku, '[-_.][^-_.]*$', '');
    
    IF base_sku = product_record.sku THEN
      -- Si le SKU n'a pas de séparateur, on considère qu'il s'agit d'un produit de base
      base_sku := product_record.sku;
    END IF;
    
    -- Compter combien de variantes ont ce SKU de base
    SELECT COUNT(*) INTO variants_count
    FROM public.products
    WHERE sku LIKE base_sku || '%' AND id != product_record.id;
    
    -- S'il y a des variantes, extraire leurs attributs
    IF variants_count > 0 THEN
      -- Créer une structure pour stocker les attributs de variation
      variant_attributes := '{}'::jsonb;
      
      -- Pour chaque variante, analyser ses attributs
      FOR variant_values IN
        SELECT attributes
        FROM public.products
        WHERE sku LIKE base_sku || '%' AND id != product_record.id AND attributes IS NOT NULL
      LOOP
        -- Fusionner les attributs dans notre structure
        variant_attributes := variant_attributes || variant_values;
      END LOOP;
      
      -- Retourner le produit parent et ses informations de variantes
      parent_id := product_record.id;
      parent_name := product_record.name;
      parent_sku := base_sku;
      variation_attributes := variant_attributes;
      
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$function$;

-- 3. Fonction organize_product_variants - correction SET search_path
CREATE OR REPLACE FUNCTION public.organize_product_variants()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path = public
AS $function$
DECLARE
  product_group RECORD;
  variant_record RECORD;
  key_record RECORD;
  base_sku text;
  extracted_attributes jsonb;
  current_parent_id uuid;
BEGIN
  -- Réinitialiser les marqueurs de variante pour tous les produits
  UPDATE public.products SET is_parent = false, is_variation = false WHERE true;
  
  -- Pour chaque groupe de produits partageant un SKU de base
  FOR product_group IN 
    SELECT DISTINCT regexp_replace(sku, '[-_.][^-_.]*$', '') as base_sku
    FROM public.products 
    WHERE sku IS NOT NULL AND sku != ''
  LOOP
    base_sku := product_group.base_sku;
    
    -- Si le SKU de base existe exactement, c'est le parent
    UPDATE public.products 
    SET is_parent = true 
    WHERE sku = base_sku;
    
    -- Si aucun produit n'a exactement ce SKU, prendre le premier comme parent
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE sku = base_sku) THEN
      UPDATE public.products 
      SET is_parent = true 
      WHERE id = (
        SELECT id FROM public.products 
        WHERE sku LIKE base_sku || '%' 
        ORDER BY length(sku) ASC, sku ASC 
        LIMIT 1
      );
    END IF;
    
    -- Récupérer l'ID du parent pour ce groupe
    SELECT id INTO current_parent_id FROM public.products 
    WHERE is_parent = true AND sku LIKE base_sku || '%' 
    LIMIT 1;
    
    IF current_parent_id IS NOT NULL THEN
      -- Marquer les autres produits du groupe comme variantes et définir leur parent_id
      UPDATE public.products 
      SET 
        is_variation = true,
        parent_id = current_parent_id
      WHERE 
        sku LIKE base_sku || '%' AND
        id != current_parent_id;
      
      -- Extraire les attributs de toutes les variantes
      extracted_attributes := '{}'::jsonb;
      
      -- Pour chaque variante
      FOR variant_record IN 
        SELECT id, attributes FROM public.products 
        WHERE parent_id = current_parent_id AND attributes IS NOT NULL
      LOOP
        -- Pour chaque attribut de la variante
        IF variant_record.attributes IS NOT NULL THEN
          FOR key_record IN SELECT * FROM jsonb_each(variant_record.attributes)
          LOOP
            -- Si l'attribut existe déjà dans notre structure
            IF extracted_attributes ? key_record.key THEN
              -- Vérifier si la valeur existe déjà dans le tableau de cet attribut
              IF NOT extracted_attributes->key_record.key @> jsonb_build_array(key_record.value) THEN
                -- Ajouter la valeur au tableau
                extracted_attributes := jsonb_set(
                  extracted_attributes,
                  ARRAY[key_record.key],
                  (extracted_attributes->key_record.key) || jsonb_build_array(key_record.value)
                );
              END IF;
            ELSE
              -- Créer l'attribut avec un tableau contenant cette valeur
              extracted_attributes := jsonb_set(
                extracted_attributes,
                ARRAY[key_record.key],
                jsonb_build_array(key_record.value)
              );
            END IF;
          END LOOP;
        END IF;
      END LOOP;
      
      -- Mettre à jour le produit parent avec les attributs de variation
      UPDATE public.products 
      SET variation_attributes = extracted_attributes
      WHERE id = current_parent_id;
    END IF;
  END LOOP;
END;
$function$;

-- 4. Fonction get_company_recent_activity - correction SET search_path
CREATE OR REPLACE FUNCTION public.get_company_recent_activity(p_company_id uuid, p_limit integer DEFAULT 10)
 RETURNS TABLE(activity_type text, activity_description text, entity_id uuid, entity_name text, created_at timestamp with time zone, user_name text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  (
    SELECT 
      'client_created'::TEXT,
      'Nouveau client créé'::TEXT,
      c.id,
      c.name,
      c.created_at,
      COALESCE(p.first_name || ' ' || p.last_name, 'Système')::TEXT
    FROM public.clients c
    LEFT JOIN public.profiles p ON c.user_id = p.id
    WHERE c.company_id = p_company_id
    ORDER BY c.created_at DESC
    LIMIT p_limit / 4
  )
  UNION ALL
  (
    SELECT 
      'offer_created'::TEXT,
      'Nouvelle offre créée'::TEXT,
      o.id,
      o.client_name,
      o.created_at,
      COALESCE(p.first_name || ' ' || p.last_name, 'Système')::TEXT
    FROM public.offers o
    LEFT JOIN public.profiles p ON o.user_id = p.id
    WHERE o.company_id = p_company_id
    ORDER BY o.created_at DESC
    LIMIT p_limit / 4
  )
  UNION ALL
  (
    SELECT 
      'contract_created'::TEXT,
      'Nouveau contrat signé'::TEXT,
      ct.id,
      ct.client_name,
      ct.created_at,
      COALESCE(p.first_name || ' ' || p.last_name, 'Système')::TEXT
    FROM public.contracts ct
    LEFT JOIN public.profiles p ON ct.user_id = p.id
    WHERE ct.company_id = p_company_id
    ORDER BY ct.created_at DESC
    LIMIT p_limit / 4
  )
  UNION ALL
  (
    SELECT 
      'product_created'::TEXT,
      'Nouveau produit ajouté'::TEXT,
      pr.id,
      pr.name,
      pr.created_at,
      'Système'::TEXT
    FROM public.products pr
    WHERE pr.company_id = p_company_id
    ORDER BY pr.created_at DESC
    LIMIT p_limit / 4
  )
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$function$;

-- 5. Fonction create_company_user - correction SET search_path
CREATE OR REPLACE FUNCTION public.create_company_user(p_email text, p_password text, p_first_name text, p_last_name text, p_role text, p_company_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
DECLARE
  new_user_id UUID;
  user_metadata JSONB;
BEGIN
  -- Create metadata object
  user_metadata := jsonb_build_object(
    'first_name', p_first_name,
    'last_name', p_last_name,
    'role', p_role
  );
  
  -- Create the user in auth.users
  INSERT INTO auth.users (
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  VALUES (
    p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    user_metadata,
    now(),
    now()
  )
  RETURNING id INTO new_user_id;
  
  -- Create the profile
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role,
    company_id
  )
  VALUES (
    new_user_id,
    p_first_name,
    p_last_name,
    p_role,
    p_company_id
  );
  
  RETURN new_user_id;
END;
$function$;

-- 6. Fonction update_company_user - correction SET search_path
CREATE OR REPLACE FUNCTION public.update_company_user(p_user_id uuid, p_first_name text, p_last_name text, p_role text, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  UPDATE public.profiles
  SET 
    first_name = p_first_name,
    last_name = p_last_name,
    role = p_role,
    company_id = COALESCE(p_company_id, company_id),
    updated_at = now()
  WHERE id = p_user_id;
  
  RETURN FOUND;
END;
$function$;

-- 7. Fonction can_manage_users - correction SET search_path
CREATE OR REPLACE FUNCTION public.can_manage_users()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
END;
$function$;

-- 8. Fonction get_company_users - correction SET search_path
CREATE OR REPLACE FUNCTION public.get_company_users(p_company_id uuid, role_filter text DEFAULT NULL::text)
 RETURNS TABLE(user_id uuid, email character varying, first_name text, last_name text, role text, created_at timestamp with time zone, last_sign_in_at timestamp with time zone, has_user_account boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    au.email,
    p.first_name,
    p.last_name,
    p.role,
    au.created_at,
    au.last_sign_in_at,
    TRUE as has_user_account
  FROM public.profiles p
  JOIN auth.users au ON p.id = au.id
  WHERE p.company_id = p_company_id
    AND p.role IN ('admin', 'super_admin')  -- Seulement les vrais utilisateurs du logiciel
    AND au.email != 'ecommerce@itakecare.be'  -- Exclure l'utilisateur SaaS
    AND (role_filter IS NULL OR p.role = role_filter)
  ORDER BY au.created_at DESC;
END;
$function$;

-- 9. Fonction user_has_permission - correction SET search_path
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user_id uuid, p_permission_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  user_role text;
  has_permission boolean := false;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
  
  -- Les super_admin ont toutes les permissions
  IF user_role = 'super_admin' THEN
    RETURN true;
  END IF;
  
  -- Les admin ont toutes les permissions par défaut (sauf si explicitement refusées)
  IF user_role = 'admin' THEN
    -- Vérifier s'il y a une permission explicitement refusée
    SELECT NOT EXISTS (
      SELECT 1 FROM public.user_permissions up
      JOIN public.permissions p ON up.permission_id = p.id
      WHERE up.user_id = p_user_id 
        AND p.name = p_permission_name 
        AND up.granted = false
        AND (up.expires_at IS NULL OR up.expires_at > now())
    ) INTO has_permission;
    
    RETURN has_permission;
  END IF;
  
  -- Pour les autres rôles, vérifier les permissions explicites
  SELECT EXISTS (
    SELECT 1 FROM public.user_permissions up
    JOIN public.permissions p ON up.permission_id = p.id
    WHERE up.user_id = p_user_id 
      AND p.name = p_permission_name 
      AND up.granted = true
      AND (up.expires_at IS NULL OR up.expires_at > now())
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$function$;

-- 10. Fonction get_user_permissions - correction SET search_path
CREATE OR REPLACE FUNCTION public.get_user_permissions(p_user_id uuid)
 RETURNS TABLE(permission_name text, permission_description text, module text, action text, granted boolean, expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE
  user_role text;
BEGIN
  -- Récupérer le rôle de l'utilisateur
  SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
  
  -- Les super_admin ont toutes les permissions
  IF user_role = 'super_admin' THEN
    RETURN QUERY
    SELECT 
      p.name,
      p.description,
      p.module,
      p.action,
      true as granted,
      null::timestamp with time zone as expires_at
    FROM public.permissions p
    ORDER BY p.module, p.action;
    RETURN;
  END IF;
  
  -- Les admin ont toutes les permissions par défaut (sauf refusées explicitement)
  IF user_role = 'admin' THEN
    RETURN QUERY
    SELECT 
      p.name,
      p.description,
      p.module,
      p.action,
      COALESCE(up.granted, true) as granted,
      up.expires_at
    FROM public.permissions p
    LEFT JOIN public.user_permissions up ON p.id = up.permission_id AND up.user_id = p_user_id
    WHERE (up.expires_at IS NULL OR up.expires_at > now() OR up.expires_at IS NULL)
    ORDER BY p.module, p.action;
    RETURN;
  END IF;
  
  -- Pour les autres rôles, retourner seulement les permissions explicites
  RETURN QUERY
  SELECT 
    p.name,
    p.description,
    p.module,
    p.action,
    up.granted,
    up.expires_at
  FROM public.permissions p
  JOIN public.user_permissions up ON p.id = up.permission_id
  WHERE up.user_id = p_user_id 
    AND (up.expires_at IS NULL OR up.expires_at > now())
  ORDER BY p.module, p.action;
END;
$function$;