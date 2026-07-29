-- WINLEASE PHASE 1 : rôle financeur, partenaires de financement, grilles de coefficients
-- Un tenant company_type='financeur' (ex. Winlease) reçoit des demandes de financement
-- déposées par ses partenaires/brokers (financing_partners) au tarif de leur grille.

-- 1. Valeur d'enum app_role 'financeur' (pattern broker)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'financeur'
  ) THEN
    ALTER TYPE app_role ADD VALUE 'financeur';
  END IF;
END $$;

-- 2. Autoriser company_type = 'financeur'
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_company_type_check;
ALTER TABLE public.companies
  ADD CONSTRAINT companies_company_type_check
  CHECK (company_type IN ('standard', 'broker', 'financeur'));

COMMENT ON COLUMN public.companies.company_type IS
'Type de company : standard (entreprise classique), broker (courtier indépendant) ou financeur (bailleur type Winlease)';

-- 3. Grilles de coefficients attribuables (par partenaire/broker/client)
CREATE TABLE IF NOT EXISTS public.coefficient_grids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.coefficient_grid_ranges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id uuid NOT NULL REFERENCES public.coefficient_grids(id) ON DELETE CASCADE,
  min numeric NOT NULL DEFAULT 0,
  max numeric NOT NULL DEFAULT 0,
  duration_months integer NOT NULL DEFAULT 36,
  coefficient numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coefficient_grids_company ON public.coefficient_grids(company_id);
CREATE INDEX IF NOT EXISTS idx_coefficient_grid_ranges_grid ON public.coefficient_grid_ranges(grid_id);

-- 4. Partenaires / brokers apporteurs d'un financeur
CREATE TABLE IF NOT EXISTS public.financing_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  partner_type text NOT NULL DEFAULT 'partner' CHECK (partner_type IN ('partner', 'broker')),
  name text NOT NULL,
  contact_name text,
  email text,
  phone text,
  vat_number text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'BE',
  status text NOT NULL DEFAULT 'active',
  coefficient_grid_id uuid REFERENCES public.coefficient_grids(id) ON DELETE SET NULL,
  notes text,
  has_user_account boolean DEFAULT false,
  user_account_created_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_financing_partners_company ON public.financing_partners(company_id);
CREATE INDEX IF NOT EXISTS idx_financing_partners_user ON public.financing_partners(user_id);

-- 5. Rattachement des demandes et clients finaux au partenaire apporteur
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS financing_partner_id uuid REFERENCES public.financing_partners(id);
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS financing_partner_id uuid REFERENCES public.financing_partners(id);
CREATE INDEX IF NOT EXISTS idx_offers_financing_partner ON public.offers(financing_partner_id) WHERE financing_partner_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_financing_partner ON public.clients(financing_partner_id) WHERE financing_partner_id IS NOT NULL;

-- 6. Fonctions helpers (pattern ambassadeur)
CREATE OR REPLACE FUNCTION public.is_financing_partner()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM financing_partners
    WHERE user_id = auth.uid()
    AND status = 'active'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_financing_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM financing_partners WHERE user_id = auth.uid() LIMIT 1
$$;

-- Infos d'un financeur par slug (pattern get_broker_by_slug)
CREATE OR REPLACE FUNCTION public.get_financeur_by_slug(financeur_slug text)
RETURNS TABLE(
  id uuid,
  name text,
  slug text,
  logo_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  modules_enabled text[],
  company_type text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT c.id, c.name, c.slug, c.logo_url, c.primary_color, c.secondary_color,
         c.accent_color, c.modules_enabled, c.company_type, c.is_active,
         c.created_at, c.updated_at
  FROM public.companies c
  WHERE c.slug = financeur_slug
    AND c.company_type = 'financeur'
    AND c.is_active = true
  LIMIT 1;
END;
$function$;

-- 7. RLS
ALTER TABLE public.coefficient_grids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coefficient_grid_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financing_partners ENABLE ROW LEVEL SECURITY;

-- Équipe du financeur : gestion complète sur ses grilles et partenaires
DROP POLICY IF EXISTS coefficient_grids_company_all ON public.coefficient_grids;
CREATE POLICY coefficient_grids_company_all ON public.coefficient_grids
  FOR ALL USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS coefficient_grid_ranges_company_all ON public.coefficient_grid_ranges;
CREATE POLICY coefficient_grid_ranges_company_all ON public.coefficient_grid_ranges
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.coefficient_grids g WHERE g.id = grid_id AND g.company_id = public.get_user_company_id())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.coefficient_grids g WHERE g.id = grid_id AND g.company_id = public.get_user_company_id())
  );

DROP POLICY IF EXISTS financing_partners_company_all ON public.financing_partners;
CREATE POLICY financing_partners_company_all ON public.financing_partners
  FOR ALL USING (company_id = public.get_user_company_id())
  WITH CHECK (company_id = public.get_user_company_id());

-- Partenaire : voit sa propre fiche et sa grille
DROP POLICY IF EXISTS financing_partners_self_select ON public.financing_partners;
CREATE POLICY financing_partners_self_select ON public.financing_partners
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS coefficient_grids_partner_select ON public.coefficient_grids;
CREATE POLICY coefficient_grids_partner_select ON public.coefficient_grids
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.financing_partners fp
      WHERE fp.user_id = auth.uid() AND fp.coefficient_grid_id = coefficient_grids.id
    )
  );

DROP POLICY IF EXISTS coefficient_grid_ranges_partner_select ON public.coefficient_grid_ranges;
CREATE POLICY coefficient_grid_ranges_partner_select ON public.coefficient_grid_ranges
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.financing_partners fp
      WHERE fp.user_id = auth.uid() AND fp.coefficient_grid_id = coefficient_grid_ranges.grid_id
    )
  );

-- Partenaire : voit ses propres demandes, leurs équipements et ses clients finaux
DROP POLICY IF EXISTS offers_financing_partner_select ON public.offers;
CREATE POLICY offers_financing_partner_select ON public.offers
  FOR SELECT TO authenticated
  USING (
    is_financing_partner()
    AND financing_partner_id = get_financing_partner_id()
  );

DROP POLICY IF EXISTS offer_equipment_financing_partner_select ON public.offer_equipment;
CREATE POLICY offer_equipment_financing_partner_select ON public.offer_equipment
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offers o
      WHERE o.id = offer_id
      AND o.financing_partner_id = public.get_financing_partner_id()
    )
  );

DROP POLICY IF EXISTS clients_financing_partner_select ON public.clients;
CREATE POLICY clients_financing_partner_select ON public.clients
  FOR SELECT TO authenticated
  USING (
    is_financing_partner()
    AND financing_partner_id = get_financing_partner_id()
  );

-- 8. Création d'une demande de financement par un partenaire (transactionnelle,
--    coefficient recalculé côté serveur depuis la grille du partenaire)
CREATE OR REPLACE FUNCTION public.create_financing_request(
  p_client jsonb,
  p_equipment jsonb,
  p_duration integer,
  p_remarks text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_partner financing_partners%ROWTYPE;
  v_client_id uuid;
  v_amount numeric := 0;
  v_coefficient numeric;
  v_monthly numeric;
  v_offer_id uuid;
  v_line jsonb;
  v_line_total numeric;
BEGIN
  SELECT * INTO v_partner FROM financing_partners
  WHERE user_id = auth.uid() AND status = 'active'
  LIMIT 1;

  IF v_partner.id IS NULL THEN
    RAISE EXCEPTION 'Utilisateur non autorisé : aucun partenaire de financement actif';
  END IF;

  IF v_partner.coefficient_grid_id IS NULL THEN
    RAISE EXCEPTION 'Aucune grille de coefficients attribuée à ce partenaire';
  END IF;

  IF p_equipment IS NULL OR jsonb_array_length(p_equipment) = 0 THEN
    RAISE EXCEPTION 'Au moins une ligne d''équipement est requise';
  END IF;

  -- Montant total = somme des lignes
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_equipment)
  LOOP
    v_amount := v_amount + COALESCE((v_line->>'purchase_price')::numeric, 0) * COALESCE((v_line->>'quantity')::numeric, 1);
  END LOOP;

  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'Le montant total doit être positif';
  END IF;

  -- Coefficient depuis la grille du partenaire (montant + durée)
  SELECT r.coefficient INTO v_coefficient
  FROM coefficient_grid_ranges r
  WHERE r.grid_id = v_partner.coefficient_grid_id
    AND v_amount >= r.min AND v_amount <= r.max
    AND r.duration_months = p_duration
  ORDER BY r.min
  LIMIT 1;

  IF v_coefficient IS NULL THEN
    RAISE EXCEPTION 'Aucun coefficient dans la grille pour un montant de % € sur % mois', v_amount, p_duration;
  END IF;

  v_monthly := round(v_amount * v_coefficient / 100, 2);

  -- Client final : réutiliser si fourni, sinon créer
  IF p_client ? 'id' AND (p_client->>'id') IS NOT NULL AND (p_client->>'id') <> '' THEN
    SELECT id INTO v_client_id FROM clients
    WHERE id = (p_client->>'id')::uuid
      AND financing_partner_id = v_partner.id
      AND company_id = v_partner.company_id;
    IF v_client_id IS NULL THEN
      RAISE EXCEPTION 'Client final introuvable pour ce partenaire';
    END IF;
  ELSE
    INSERT INTO clients (
      company_id, financing_partner_id, name, company, email, phone,
      vat_number, contact_name, address, city, postal_code, country, status
    ) VALUES (
      v_partner.company_id,
      v_partner.id,
      COALESCE(p_client->>'name', p_client->>'company', 'Client'),
      p_client->>'company',
      p_client->>'email',
      p_client->>'phone',
      p_client->>'vat_number',
      p_client->>'contact_name',
      p_client->>'address',
      p_client->>'city',
      p_client->>'postal_code',
      COALESCE(p_client->>'country', 'BE'),
      'active'
    )
    RETURNING id INTO v_client_id;
  END IF;

  -- Demande de financement
  INSERT INTO offers (
    company_id, client_id, client_name, client_email,
    financing_partner_id, user_id,
    type, source, workflow_status, status,
    amount, coefficient, monthly_payment, financed_amount, duration,
    margin, remarks
  ) VALUES (
    v_partner.company_id,
    v_client_id,
    COALESCE(p_client->>'name', p_client->>'company', 'Client'),
    p_client->>'email',
    v_partner.id,
    auth.uid(),
    'financing_request',
    'financing_partner',
    'sent',
    'pending',
    v_amount,
    v_coefficient,
    v_monthly,
    v_amount,
    p_duration,
    0,
    p_remarks
  )
  RETURNING id INTO v_offer_id;

  -- Lignes d'équipement
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_equipment)
  LOOP
    v_line_total := COALESCE((v_line->>'purchase_price')::numeric, 0) * COALESCE((v_line->>'quantity')::numeric, 1);
    INSERT INTO offer_equipment (
      offer_id, title, purchase_price, quantity, margin, monthly_payment, duration
    ) VALUES (
      v_offer_id,
      v_line->>'title',
      COALESCE((v_line->>'purchase_price')::numeric, 0),
      COALESCE((v_line->>'quantity')::integer, 1),
      0,
      round(v_line_total * v_coefficient / 100, 2),
      p_duration
    );
  END LOOP;

  RETURN v_offer_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.create_financing_request(jsonb, jsonb, integer, text) TO authenticated;
