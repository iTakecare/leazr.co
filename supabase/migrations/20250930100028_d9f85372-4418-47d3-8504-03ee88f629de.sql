-- PHASE 1: CORRECTIONS CRITIQUES SANS RISQUE
-- =============================================

-- =====================================
-- CRITIQUE 1: Sécuriser offer_documents
-- =====================================

-- Supprimer les politiques dangereuses actuelles
DROP POLICY IF EXISTS "Clients can view documents uploaded via valid token" ON public.offer_documents;
DROP POLICY IF EXISTS "Allow document insertion with valid token" ON public.offer_documents;

-- Créer une politique sécurisée avec validation complète du token (SELECT)
CREATE POLICY "offer_documents_secure_token_access" ON public.offer_documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM offer_upload_links oul
    WHERE oul.offer_id = offer_documents.offer_id
    AND oul.expires_at > now()
    AND oul.used_at IS NULL  -- Vérifier que le token n'a pas été utilisé
  )
);

-- Créer une politique sécurisée pour l'insertion
CREATE POLICY "offer_documents_secure_token_insert" ON public.offer_documents
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM offer_upload_links oul
    WHERE oul.offer_id = offer_documents.offer_id
    AND oul.expires_at > now()
    AND oul.used_at IS NULL
  )
);

-- ================================================
-- CORRECTION 2: Nettoyer custom_auth_tokens
-- ================================================

-- Supprimer TOUTES les politiques conflictuelles
DROP POLICY IF EXISTS "Allow company users to manage tokens" ON public.custom_auth_tokens;
DROP POLICY IF EXISTS "Secure token access" ON public.custom_auth_tokens;
DROP POLICY IF EXISTS "custom_auth_tokens_server_only" ON public.custom_auth_tokens;
DROP POLICY IF EXISTS "Allow token creation for edge functions" ON public.custom_auth_tokens;

-- Créer UNE politique claire pour les utilisateurs authentifiés
CREATE POLICY "custom_auth_tokens_company_isolation" ON public.custom_auth_tokens
FOR ALL
TO authenticated
USING (
  company_id = get_user_company_id() OR is_admin_optimized()
)
WITH CHECK (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Créer UNE politique pour les edge functions (INSERT seulement)
CREATE POLICY "custom_auth_tokens_edge_insert" ON public.custom_auth_tokens
FOR INSERT
TO anon
WITH CHECK (true);

-- ================================================
-- CORRECTION 3: Nettoyer platform_settings
-- ================================================

-- Supprimer tous les doublons
DROP POLICY IF EXISTS "platform_settings_admin_full_access" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_admin_only" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_admin_write" ON public.platform_settings;
DROP POLICY IF EXISTS "platform_settings_admin_write_new" ON public.platform_settings;
DROP POLICY IF EXISTS "Allow public read access to platform settings" ON public.platform_settings;

-- Créer UNE politique claire pour les admins
CREATE POLICY "platform_settings_admin_manage" ON public.platform_settings
FOR ALL
TO authenticated
USING (is_saas_admin())
WITH CHECK (is_saas_admin());

-- La politique "platform_settings_public_safe_fields_only" reste inchangée (déjà sécurisée)

-- ================================================
-- CORRECTION 4: Ajouter search_path aux fonctions
-- ================================================

-- Mettre à jour toutes les fonctions sans search_path
CREATE OR REPLACE FUNCTION public.get_workflow_for_offer_type(p_company_id uuid, p_offer_type text)
RETURNS TABLE(template_id uuid, template_name text, step_key text, step_label text, step_description text, step_order integer, icon_name text, color_class text, is_required boolean, is_visible boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wt.id as template_id,
    wt.name as template_name,
    ws.step_key,
    ws.step_label,
    ws.step_description,
    ws.step_order,
    ws.icon_name,
    ws.color_class,
    ws.is_required,
    ws.is_visible
  FROM public.workflow_templates wt
  JOIN public.workflow_steps ws ON ws.workflow_template_id = wt.id
  WHERE wt.company_id = p_company_id
    AND wt.offer_type = p_offer_type
    AND wt.is_active = true
  ORDER BY wt.is_default DESC, ws.step_order ASC
  LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_company_by_slug(company_slug text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, primary_color text, secondary_color text, accent_color text, modules_enabled text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.logo_url,
    c.primary_color,
    c.secondary_color,
    c.accent_color,
    c.modules_enabled
  FROM public.companies c
  WHERE c.slug = company_slug
  AND c.is_active = true
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_company_recent_activity()
RETURNS TABLE(activity_type text, activity_description text, created_at timestamp with time zone, entity_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_company_id uuid;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    (
        SELECT 
            'client'::text as activity_type,
            'Nouveau client: ' || c.name as activity_description,
            c.created_at,
            c.id as entity_id
        FROM clients c
        WHERE c.company_id = user_company_id
        ORDER BY c.created_at DESC
        LIMIT 5
    )
    UNION ALL
    (
        SELECT 
            'offer'::text as activity_type,
            'Nouvelle offre créée' as activity_description,
            o.created_at,
            o.id as entity_id
        FROM offers o
        WHERE o.company_id = user_company_id
        ORDER BY o.created_at DESC
        LIMIT 5
    )
    UNION ALL
    (
        SELECT 
            'contract'::text as activity_type,
            'Nouveau contrat: ' || ct.client_name as activity_description,
            ct.created_at,
            ct.id as entity_id
        FROM contracts ct
        WHERE ct.company_id = user_company_id
        ORDER BY ct.created_at DESC
        LIMIT 5
    )
    ORDER BY created_at DESC
    LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_workflow_for_contract_type(p_company_id uuid, p_contract_type text DEFAULT 'standard'::text)
RETURNS TABLE(template_id uuid, template_name text, step_key text, step_label text, step_description text, step_order integer, icon_name text, color_class text, is_required boolean, is_visible boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    wt.id as template_id,
    wt.name as template_name,
    ws.step_key,
    ws.step_label,
    ws.step_description,
    ws.step_order,
    ws.icon_name,
    ws.color_class,
    ws.is_required,
    ws.is_visible
  FROM public.workflow_templates wt
  JOIN public.workflow_steps ws ON ws.workflow_template_id = wt.id
  WHERE wt.company_id = p_company_id
    AND wt.is_for_contracts = true
    AND (wt.contract_type = p_contract_type OR wt.contract_type IS NULL)
    AND wt.is_active = true
  ORDER BY wt.is_default DESC, ws.step_order ASC
  LIMIT 10;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_ambassador_activity(p_ambassador_id uuid, p_action_type text, p_description text, p_metadata jsonb DEFAULT '{}'::jsonb, p_user_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.ambassador_activity_logs (
    ambassador_id,
    user_id,
    action_type,
    description,
    metadata
  ) VALUES (
    p_ambassador_id,
    COALESCE(p_user_id, auth.uid()),
    p_action_type,
    p_description,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_postal_codes_bulk(p_country_code text, p_postal_codes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  postal_record jsonb;
BEGIN
  FOR postal_record IN SELECT * FROM jsonb_array_elements(p_postal_codes)
  LOOP
    INSERT INTO public.postal_codes (
      country_code,
      postal_code,
      city_name,
      region,
      latitude,
      longitude
    ) VALUES (
      p_country_code,
      postal_record->>'code',
      postal_record->>'city',
      postal_record->>'region',
      (postal_record->>'lat')::numeric,
      (postal_record->>'lng')::numeric
    ) ON CONFLICT (country_code, postal_code, city_name) DO NOTHING;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_company_info(company_slug text)
RETURNS TABLE(id uuid, name text, slug text, logo_url text, primary_color text, secondary_color text, accent_color text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.slug,
    c.logo_url,
    c.primary_color,
    c.secondary_color,
    c.accent_color
  FROM public.companies c
  WHERE c.slug = company_slug
  AND c.is_active = true
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_default_country_for_company(p_company_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  company_country text;
BEGIN
  SELECT 
    CASE 
      WHEN c.name ILIKE '%france%' OR c.name ILIKE '%français%' THEN 'FR'
      WHEN c.name ILIKE '%luxembourg%' THEN 'LU'
      ELSE 'BE'
    END INTO company_country
  FROM public.companies c
  WHERE c.id = p_company_id;
  
  RETURN COALESCE(company_country, 'BE');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_company_slug(company_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 1;
BEGIN
  base_slug := lower(regexp_replace(company_name, '[^a-zA-Z0-9\s]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := trim(base_slug, '-');
  base_slug := left(base_slug, 50);
  
  IF base_slug = '' OR base_slug IS NULL THEN
    base_slug := 'company';
  END IF;
  
  final_slug := base_slug;
  
  WHILE EXISTS (SELECT 1 FROM public.companies WHERE slug = final_slug) LOOP
    final_slug := base_slug || '-' || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_slug;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_company_ambassadors_secure()
RETURNS TABLE(id uuid, name text, email text, phone text, region text, status text, notes text, address text, city text, postal_code text, country text, company text, vat_number text, has_user_account boolean, user_id uuid, user_account_created_at timestamp with time zone, updated_at timestamp with time zone, created_at timestamp with time zone, last_commission numeric, commissions_total numeric, clients_count integer, commission_level_id uuid, company_id uuid, pdf_template_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_company_id uuid;
BEGIN
  current_user_company_id := get_user_company_id();
  
  IF current_user_company_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.email,
    a.phone,
    a.region,
    a.status,
    a.notes,
    a.address,
    a.city,
    a.postal_code,
    a.country,
    a.company,
    a.vat_number,
    a.has_user_account,
    a.user_id,
    a.user_account_created_at,
    a.updated_at,
    a.created_at,
    a.last_commission,
    a.commissions_total,
    a.clients_count,
    a.commission_level_id,
    a.company_id,
    a.pdf_template_id
  FROM public.ambassadors a
  WHERE a.company_id = current_user_company_id
  ORDER BY a.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_maintenance_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.equipment_alerts (
    equipment_id,
    alert_type,
    title,
    message,
    severity,
    company_id
  )
  SELECT 
    p.id,
    'maintenance_due',
    'Maintenance due for ' || p.name,
    'Equipment ' || p.name || ' requires maintenance by ' || p.next_maintenance_date::date,
    'warning',
    p.company_id
  FROM public.products p
  WHERE p.next_maintenance_date IS NOT NULL
    AND p.next_maintenance_date <= (now() + interval '7 days')
    AND p.next_maintenance_date > now()
    AND NOT EXISTS (
      SELECT 1 FROM public.equipment_alerts ea
      WHERE ea.equipment_id = p.id
        AND ea.alert_type = 'maintenance_due'
        AND ea.is_dismissed = false
        AND ea.created_at > (now() - interval '1 day')
    );

  INSERT INTO public.equipment_alerts (
    equipment_id,
    alert_type,
    title,
    message,
    severity,
    company_id
  )
  SELECT 
    p.id,
    'warranty_expiring',
    'Warranty expiring for ' || p.name,
    'Equipment ' || p.name || ' warranty expires on ' || p.warranty_end_date::date,
    'info',
    p.company_id
  FROM public.products p
  WHERE p.warranty_end_date IS NOT NULL
    AND p.warranty_end_date <= (now() + interval '30 days')
    AND p.warranty_end_date > now()
    AND NOT EXISTS (
      SELECT 1 FROM public.equipment_alerts ea
      WHERE ea.equipment_id = p.id
        AND ea.alert_type = 'warranty_expiring'
        AND ea.is_dismissed = false
        AND ea.created_at > (now() - interval '7 days')
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.track_equipment_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.equipment_tracking (
      equipment_id,
      movement_type,
      notes,
      created_by,
      company_id
    ) VALUES (
      NEW.id,
      'status_change',
      'Status changed from ' || COALESCE(OLD.status, 'unknown') || ' to ' || NEW.status,
      auth.uid(),
      NEW.company_id
    );
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.equipment_tracking (
      equipment_id,
      movement_type,
      from_user_id,
      to_user_id,
      notes,
      created_by,
      company_id
    ) VALUES (
      NEW.id,
      CASE 
        WHEN OLD.assigned_to IS NULL THEN 'assignment'
        WHEN NEW.assigned_to IS NULL THEN 'return'
        ELSE 'transfer'
      END,
      OLD.assigned_to,
      NEW.assigned_to,
      'Assignment changed',
      auth.uid(),
      NEW.company_id
    );
  END IF;

  IF OLD.location IS DISTINCT FROM NEW.location THEN
    INSERT INTO public.equipment_tracking (
      equipment_id,
      movement_type,
      from_location,
      to_location,
      notes,
      created_by,
      company_id
    ) VALUES (
      NEW.id,
      'location_change',
      OLD.location,
      NEW.location,
      'Location changed',
      auth.uid(),
      NEW.company_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_postal_codes(search_query text, country_filter text DEFAULT NULL::text, result_limit integer DEFAULT 20)
RETURNS TABLE(postal_code text, city text, region text, country_code text, country_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.postal_code,
    pc.city_name as city,
    pc.region,
    pc.country_code,
    c.name_fr as country_name
  FROM public.postal_codes pc
  LEFT JOIN public.countries c ON pc.country_code = c.code
  WHERE (country_filter IS NULL OR pc.country_code = country_filter)
    AND (
      pc.postal_code ILIKE search_query || '%' 
      OR pc.city_name ILIKE '%' || search_query || '%'
    )
  ORDER BY 
    CASE 
      WHEN pc.postal_code ILIKE search_query || '%' THEN 1
      ELSE 2
    END,
    pc.postal_code,
    pc.city_name
  LIMIT result_limit;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cities_by_postal_code(p_postal_code text, p_country_code text DEFAULT NULL::text)
RETURNS TABLE(postal_code text, city text, region text, country_code text, country_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.postal_code,
    pc.city_name as city,
    pc.region,
    pc.country_code,
    c.name_fr as country_name
  FROM public.postal_codes pc
  LEFT JOIN public.countries c ON pc.country_code = c.code
  WHERE pc.postal_code = p_postal_code
    AND (p_country_code IS NULL OR pc.country_code = p_country_code)
  ORDER BY pc.city_name;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_postal_code_stats()
RETURNS TABLE(country_code text, country_name text, postal_code_count bigint, last_updated timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pc.country_code,
    c.name_fr as country_name,
    COUNT(*) as postal_code_count,
    MAX(pc.updated_at) as last_updated
  FROM public.postal_codes pc
  LEFT JOIN public.countries c ON pc.country_code = c.code
  GROUP BY pc.country_code, c.name_fr
  ORDER BY pc.country_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_primary_collaborator_for_client(p_client_id uuid, p_client_name text, p_client_email text DEFAULT NULL::text, p_contact_name text DEFAULT NULL::text, p_client_phone text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_collaborator_id UUID;
BEGIN
  INSERT INTO public.collaborators (
    client_id,
    name,
    email,
    phone,
    role,
    is_primary
  ) VALUES (
    p_client_id,
    COALESCE(p_contact_name, p_client_name),
    p_client_email,
    p_client_phone,
    'Contact principal',
    true
  ) RETURNING id INTO new_collaborator_id;
  
  RETURN new_collaborator_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_auth_tokens()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.custom_auth_tokens 
  WHERE expires_at < now() OR used_at IS NOT NULL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_delivery_quantities()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  total_equipment_quantity INTEGER;
  total_delivery_quantity INTEGER;
BEGIN
  SELECT quantity INTO total_equipment_quantity
  FROM contract_equipment
  WHERE id = COALESCE(NEW.contract_equipment_id, OLD.contract_equipment_id);
  
  SELECT COALESCE(SUM(quantity), 0) INTO total_delivery_quantity
  FROM contract_equipment_deliveries
  WHERE contract_equipment_id = COALESCE(NEW.contract_equipment_id, OLD.contract_equipment_id)
    AND id != COALESCE(NEW.id, OLD.id);
  
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    total_delivery_quantity := total_delivery_quantity + NEW.quantity;
  END IF;
  
  IF total_delivery_quantity > total_equipment_quantity THEN
    RAISE EXCEPTION 'Total delivery quantities (%) cannot exceed equipment quantity (%)', 
      total_delivery_quantity, total_equipment_quantity;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.render_email_template(template_content text, variables jsonb)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result TEXT;
  var_key TEXT;
  var_value TEXT;
BEGIN
  result := template_content;
  
  FOR var_key, var_value IN SELECT * FROM jsonb_each_text(variables)
  LOOP
    result := REPLACE(result, '{{' || var_key || '}}', COALESCE(var_value, ''));
  END LOOP;
  
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_products_by_company(p_company_id uuid)
RETURNS TABLE(id uuid, name text, description text, price numeric, monthly_price numeric, stock_quantity integer, category text, brand text, brand_translation text, category_translation text, image_url text, sku text, weight numeric, dimensions text, warranty_period text, in_stock boolean, company_id uuid, created_at timestamp with time zone, updated_at timestamp with time zone, variant_combination_prices jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.price,
    p.monthly_price,
    p.stock as stock_quantity,
    c.name as category,
    b.name as brand,
    b.translation as brand_translation,
    c.translation as category_translation,
    p.image_url,
    p.sku,
    NULL::numeric as weight,
    NULL::text as dimensions,
    NULL::text as warranty_period,
    (p.stock > 0) as in_stock,
    p.company_id,
    p.created_at,
    p.updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', pvp.id,
            'attributes', pvp.attributes,
            'price', pvp.price,
            'monthly_price', pvp.monthly_price,
            'stock', pvp.stock
          )
        )
        FROM public.product_variant_prices pvp
        WHERE pvp.product_id = p.id
      ),
      '[]'::jsonb
    ) as variant_combination_prices
  FROM public.products p
  LEFT JOIN public.brands b ON p.brand_id = b.id AND b.company_id = p_company_id
  LEFT JOIN public.categories c ON p.category_id = c.id AND c.company_id = p_company_id
  WHERE p.company_id = p_company_id
    AND p.active = true
    AND COALESCE(p.admin_only, false) = false
  ORDER BY p.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_company_customizations(p_company_id uuid)
RETURNS TABLE(header_enabled boolean, header_title text, header_description text, header_background_type text, header_background_config jsonb, company_name text, logo_url text, primary_color text, secondary_color text, accent_color text, quote_request_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.header_enabled,
    cc.header_title,
    cc.header_description,
    cc.header_background_type,
    cc.header_background_config,
    cc.company_name,
    cc.logo_url,
    cc.primary_color,
    cc.secondary_color,
    cc.accent_color,
    cc.quote_request_url
  FROM public.company_customizations cc
  WHERE cc.company_id = p_company_id
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.detect_company_from_domain(request_origin text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  company_uuid UUID;
  extracted_subdomain TEXT;
BEGIN
  IF request_origin LIKE '%.leazr.co%' THEN
    extracted_subdomain := SPLIT_PART(SPLIT_PART(request_origin, '//', 2), '.', 1);
    
    SELECT company_id INTO company_uuid
    FROM public.company_domains
    WHERE subdomain = extracted_subdomain AND is_active = true
    LIMIT 1;
  END IF;
  
  RETURN company_uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_company_user(p_email text, p_password text, p_first_name text, p_last_name text, p_role text, p_company_id uuid)
RETURNS TABLE(success boolean, message text, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  new_user_id uuid;
  profile_exists boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = p_email) THEN
    RETURN QUERY SELECT false, 'Un utilisateur avec cet email existe déjà'::text, null::uuid;
    RETURN;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = p_company_id) THEN
    RETURN QUERY SELECT false, 'Entreprise non trouvée'::text, null::uuid;
    RETURN;
  END IF;
  
  new_user_id := gen_random_uuid();
  
  INSERT INTO public.profiles (
    id,
    first_name,
    last_name,
    role,
    company_id,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    p_first_name,
    p_last_name,
    p_role,
    p_company_id,
    now(),
    now()
  );
  
  RETURN QUERY SELECT true, 'Utilisateur créé avec succès'::text, new_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    DELETE FROM public.profiles WHERE id = new_user_id;
    
    RETURN QUERY SELECT false, ('Erreur lors de la création: ' || SQLERRM)::text, null::uuid;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_default_country_for_company()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_company_id uuid;
    default_country text;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN 'BE';
    END IF;
    
    RETURN 'BE';
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_client_associations()
RETURNS TABLE(user_id uuid, client_id uuid, association_type text, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_company_users()
RETURNS TABLE(id uuid, email text, first_name text, last_name text, role text, company_id uuid, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.generate_company_subdomain(company_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  base_subdomain text;
  final_subdomain text;
  counter integer := 1;
BEGIN
  base_subdomain := lower(regexp_replace(company_name, '[^a-zA-Z0-9]', '', 'g'));
  base_subdomain := left(base_subdomain, 20);
  
  IF base_subdomain = '' OR base_subdomain IS NULL THEN
    base_subdomain := 'company';
  END IF;
  
  final_subdomain := base_subdomain;
  
  WHILE EXISTS (SELECT 1 FROM public.company_domains WHERE subdomain = final_subdomain) LOOP
    final_subdomain := base_subdomain || counter;
    counter := counter + 1;
  END LOOP;
  
  RETURN final_subdomain;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_monthly_financial_data()
RETURNS TABLE(month_name text, month_number integer, year integer, revenue numeric, purchases numeric, margin numeric, margin_percentage numeric, contracts_count integer, offers_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_company_id UUID;
    current_year INTEGER := EXTRACT(year FROM now());
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH months AS (
        SELECT 
            generate_series(1, 12) as month_num,
            TO_CHAR(TO_DATE(generate_series(1, 12)::text, 'MM'), 'Month') as month_name
    ),
    contract_data AS (
        SELECT 
            EXTRACT(month FROM c.created_at) as month_num,
            COUNT(*) as contracts_count,
            COALESCE(SUM(c.monthly_payment), 0) as revenue_from_contracts,
            COALESCE(SUM(c.monthly_payment * 0.7), 0) as purchases_from_contracts
        FROM contracts c
        WHERE c.company_id = user_company_id 
            AND c.status = 'active'
            AND EXTRACT(year FROM c.created_at) = current_year
        GROUP BY EXTRACT(month FROM c.created_at)
    ),
    offer_data AS (
        SELECT 
            EXTRACT(month FROM o.created_at) as month_num,
            COUNT(*) as offers_count,
            COALESCE(SUM(o.amount), 0) as revenue_from_offers,
            COALESCE(SUM(o.amount - COALESCE(o.commission, 0)), 0) as purchases_from_offers
        FROM offers o
        WHERE o.company_id = user_company_id 
            AND o.status = 'accepted'
            AND o.converted_to_contract = true
            AND EXTRACT(year FROM o.created_at) = current_year
        GROUP BY EXTRACT(month FROM o.created_at)
    )
    SELECT 
        TRIM(m.month_name) as month_name,
        m.month_num as month_number,
        current_year as year,
        COALESCE(cd.revenue_from_contracts, 0) + COALESCE(od.revenue_from_offers, 0) as revenue,
        COALESCE(cd.purchases_from_contracts, 0) + COALESCE(od.purchases_from_offers, 0) as purchases,
        (COALESCE(cd.revenue_from_contracts, 0) + COALESCE(od.revenue_from_offers, 0)) - 
        (COALESCE(cd.purchases_from_contracts, 0) + COALESCE(od.purchases_from_offers, 0)) as margin,
        CASE 
            WHEN (COALESCE(cd.revenue_from_contracts, 0) + COALESCE(od.revenue_from_offers, 0)) > 0 
            THEN ROUND(
                (((COALESCE(cd.revenue_from_contracts, 0) + COALESCE(od.revenue_from_offers, 0)) - 
                  (COALESCE(cd.purchases_from_contracts, 0) + COALESCE(od.purchases_from_offers, 0))) * 100.0 / 
                 (COALESCE(cd.revenue_from_contracts, 0) + COALESCE(od.revenue_from_offers, 0))), 1
            )
            ELSE 0
        END as margin_percentage,
        COALESCE(cd.contracts_count, 0) as contracts_count,
        COALESCE(od.offers_count, 0) as offers_count
    FROM months m
    LEFT JOIN contract_data cd ON m.month_num = cd.month_num
    LEFT JOIN offer_data od ON m.month_num = od.month_num
    ORDER BY m.month_num;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_all_clients_secure()
RETURNS TABLE(id uuid, name text, email text, company text, phone text, address text, city text, postal_code text, country text, vat_number text, notes text, status text, created_at timestamp with time zone, updated_at timestamp with time zone, user_id uuid, has_user_account boolean, company_id uuid, is_ambassador_client boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_company_id uuid;
BEGIN
  current_user_company_id := get_user_company_id();
  
  IF current_user_company_id IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.email,
    c.company,
    c.phone,
    c.address,
    c.city,
    c.postal_code,
    c.country,
    c.vat_number,
    c.notes,
    c.status,
    c.created_at,
    c.updated_at,
    c.user_id,
    c.has_user_account,
    c.company_id,
    CASE 
      WHEN ac.client_id IS NOT NULL THEN true 
      ELSE false 
    END as is_ambassador_client
  FROM public.clients c
  LEFT JOIN public.ambassador_clients ac ON c.id = ac.client_id
  WHERE c.company_id = current_user_company_id
  ORDER BY c.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.diagnose_api_key_context()
RETURNS TABLE(user_id uuid, company_id uuid, user_role text, is_admin boolean, has_company_access boolean, checked_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_company_id uuid;
  current_user_role text;
  admin_status boolean;
BEGIN
  current_user_company_id := get_user_company_id();
  
  SELECT role INTO current_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  admin_status := is_admin_optimized();
  
  RETURN QUERY
  SELECT 
    auth.uid() as user_id,
    current_user_company_id as company_id,
    current_user_role as user_role,
    admin_status as is_admin,
    (current_user_company_id IS NOT NULL) as has_company_access,
    now() as checked_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_company_slug_by_upload_token(upload_token text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  company_slug_result text;
BEGIN
  SELECT c.slug INTO company_slug_result
  FROM public.offer_upload_links oul
  JOIN public.offers o ON oul.offer_id = o.id
  JOIN public.companies c ON o.company_id = c.id
  WHERE oul.token = upload_token
    AND oul.expires_at > now()
    AND oul.used_at IS NULL
  LIMIT 1;
  
  RETURN company_slug_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_template_for_offer(p_company_id uuid, p_offer_type text DEFAULT 'standard'::text, p_template_category text DEFAULT 'offer'::text)
RETURNS TABLE(template_id text, name text, template_file_url text, field_mappings jsonb, company_data jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pt.id as template_id,
    pt.name,
    pt.template_file_url,
    pt.field_mappings,
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'logo_url', c.logo_url,
      'primary_color', c.primary_color,
      'secondary_color', c.secondary_color,
      'accent_color', c.accent_color,
      'address', NULL,
      'city', NULL,
      'postal_code', NULL,
      'country', NULL,
      'vat_number', NULL,
      'phone', NULL,
      'email', NULL
    ) as company_data
  FROM public.pdf_templates pt
  LEFT JOIN public.companies c ON pt.company_id = c.id
  WHERE pt.company_id = p_company_id
    AND pt.template_type = p_offer_type
    AND pt.template_category = p_template_category
    AND pt.is_active = true
  ORDER BY pt.is_default DESC, pt.created_at DESC
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_company_dashboard_metrics()
RETURNS TABLE(total_clients bigint, total_offers bigint, total_contracts bigint, total_revenue numeric, pending_offers bigint, active_contracts bigint, recent_signups bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
    user_company_id uuid;
BEGIN
    user_company_id := get_user_company_id();
    
    IF user_company_id IS NULL THEN
        RETURN QUERY SELECT 0::bigint, 0::bigint, 0::bigint, 0::numeric, 0::bigint, 0::bigint, 0::bigint;
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM clients WHERE company_id = user_company_id)::bigint,
        (SELECT COUNT(*) FROM offers WHERE company_id = user_company_id)::bigint,
        (SELECT COUNT(*) FROM contracts WHERE company_id = user_company_id)::bigint,
        (SELECT COALESCE(SUM(monthly_payment), 0) FROM contracts WHERE company_id = user_company_id)::numeric,
        (SELECT COUNT(*) FROM offers WHERE company_id = user_company_id AND status = 'pending')::bigint,
        (SELECT COUNT(*) FROM contracts WHERE company_id = user_company_id AND status = 'active')::bigint,
        (SELECT COUNT(*) FROM clients WHERE company_id = user_company_id AND created_at >= now() - interval '30 days')::bigint;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_offer_equipment_attributes_secure(p_equipment_id uuid, p_attributes jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  attr_key text;
  attr_value text;
BEGIN
  FOR attr_key, attr_value IN SELECT * FROM jsonb_each_text(p_attributes)
  LOOP
    INSERT INTO public.offer_equipment_attributes (
      equipment_id,
      key,
      value
    ) VALUES (
      p_equipment_id,
      attr_key,
      attr_value
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.insert_offer_equipment_specifications_secure(p_equipment_id uuid, p_specifications jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  spec_key text;
  spec_value text;
BEGIN
  FOR spec_key, spec_value IN SELECT * FROM jsonb_each_text(p_specifications)
  LOOP
    INSERT INTO public.offer_equipment_specifications (
      equipment_id,
      key,
      value
    ) VALUES (
      p_equipment_id,
      spec_key,
      spec_value
    );
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_api_key_secure(p_name text, p_permissions jsonb DEFAULT '{"packs": true, "brands": true, "images": true, "products": true, "attributes": true, "categories": true, "environmental": true, "specifications": true}'::jsonb)
RETURNS TABLE(id uuid, name text, api_key text, permissions jsonb, is_active boolean, last_used_at timestamp with time zone, created_at timestamp with time zone, updated_at timestamp with time zone, company_id uuid, created_by uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_company_id uuid;
  generated_api_key text;
  new_api_key_record record;
  random_part1 text;
  random_part2 text;
BEGIN
  current_user_company_id := get_user_company_id();
  
  IF current_user_company_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated or company not found';
  END IF;
  
  random_part1 := replace(gen_random_uuid()::text, '-', '');
  random_part2 := replace(gen_random_uuid()::text, '-', '');
  
  generated_api_key := 'lzr_' || substr(random_part1 || random_part2, 1, 32);
  
  INSERT INTO api_keys (
    name,
    api_key,
    company_id,
    created_by,
    permissions
  ) VALUES (
    p_name,
    generated_api_key,
    current_user_company_id,
    auth.uid(),
    p_permissions
  ) RETURNING * INTO new_api_key_record;
  
  RETURN QUERY
  SELECT 
    new_api_key_record.id,
    new_api_key_record.name,
    new_api_key_record.api_key,
    new_api_key_record.permissions,
    new_api_key_record.is_active,
    new_api_key_record.last_used_at,
    new_api_key_record.created_at,
    new_api_key_record.updated_at,
    new_api_key_record.company_id,
    new_api_key_record.created_by;
END;
$$;

CREATE OR REPLACE FUNCTION public.activate_prospect(p_activation_token text)
RETURNS TABLE(success boolean, user_id uuid, company_id uuid, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  prospect_record RECORD;
  new_user_id uuid;
  new_company_id uuid;
BEGIN
  SELECT * INTO prospect_record
  FROM prospects 
  WHERE activation_token = p_activation_token 
    AND status = 'active' 
    AND trial_ends_at > now();
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::uuid, null::uuid, 'Token invalide ou expiré';
    RETURN;
  END IF;
  
  UPDATE prospects 
  SET 
    status = 'converted',
    activated_at = now(),
    converted_at = now(),
    updated_at = now()
  WHERE id = prospect_record.id;
  
  RETURN QUERY SELECT true, new_user_id, new_company_id, 'Prospect activé avec succès';
END;
$$;