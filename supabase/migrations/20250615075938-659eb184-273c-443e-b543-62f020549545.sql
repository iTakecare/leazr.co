-- Ajouter les politiques RLS manquantes pour l'isolation multi-tenant

-- Enable RLS sur toutes les tables principales si pas déjà fait
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table clients
DROP POLICY IF EXISTS "Users can view clients from their company" ON public.clients;
CREATE POLICY "Users can view clients from their company" 
ON public.clients 
FOR SELECT 
USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can manage clients from their company" ON public.clients;
CREATE POLICY "Users can manage clients from their company" 
ON public.clients 
FOR ALL 
USING (company_id = get_user_company_id());

-- Politiques pour la table offers
DROP POLICY IF EXISTS "Users can view offers from their company" ON public.offers;
CREATE POLICY "Users can view offers from their company" 
ON public.offers 
FOR SELECT 
USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can manage offers from their company" ON public.offers;
CREATE POLICY "Users can manage offers from their company" 
ON public.offers 
FOR ALL 
USING (company_id = get_user_company_id());

-- Politiques pour la table contracts
DROP POLICY IF EXISTS "Users can view contracts from their company" ON public.contracts;
CREATE POLICY "Users can view contracts from their company" 
ON public.contracts 
FOR SELECT 
USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can manage contracts from their company" ON public.contracts;
CREATE POLICY "Users can manage contracts from their company" 
ON public.contracts 
FOR ALL 
USING (company_id = get_user_company_id());

-- Politiques pour la table ambassadors
DROP POLICY IF EXISTS "Users can view ambassadors from their company" ON public.ambassadors;
CREATE POLICY "Users can view ambassadors from their company" 
ON public.ambassadors 
FOR SELECT 
USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can manage ambassadors from their company" ON public.ambassadors;
CREATE POLICY "Users can manage ambassadors from their company" 
ON public.ambassadors 
FOR ALL 
USING (company_id = get_user_company_id());

-- Politiques pour la table partners
DROP POLICY IF EXISTS "Users can view partners from their company" ON public.partners;
CREATE POLICY "Users can view partners from their company" 
ON public.partners 
FOR SELECT 
USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can manage partners from their company" ON public.partners;
CREATE POLICY "Users can manage partners from their company" 
ON public.partners 
FOR ALL 
USING (company_id = get_user_company_id());

-- Politiques pour la table products
DROP POLICY IF EXISTS "Users can view products from their company" ON public.products;
CREATE POLICY "Users can view products from their company" 
ON public.products 
FOR SELECT 
USING (company_id = get_user_company_id());

DROP POLICY IF EXISTS "Users can manage products from their company" ON public.products;
CREATE POLICY "Users can manage products from their company" 
ON public.products 
FOR ALL 
USING (company_id = get_user_company_id());

-- Fonction pour calculer les métriques d'une entreprise spécifique
CREATE OR REPLACE FUNCTION public.get_company_dashboard_metrics(p_company_id UUID, time_filter TEXT DEFAULT 'month')
RETURNS TABLE(
  total_revenue NUMERIC,
  total_clients BIGINT,
  total_offers BIGINT,
  total_contracts BIGINT,
  pending_offers BIGINT,
  active_contracts BIGINT,
  monthly_growth_revenue NUMERIC,
  monthly_growth_clients NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Fonction pour obtenir l'activité récente d'une entreprise
CREATE OR REPLACE FUNCTION public.get_company_recent_activity(p_company_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
  activity_type TEXT,
  activity_description TEXT,
  entity_id UUID,
  entity_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  user_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Activer la réplication en temps réel pour les métriques du dashboard
ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.offers REPLICA IDENTITY FULL;
ALTER TABLE public.contracts REPLICA IDENTITY FULL;
ALTER TABLE public.products REPLICA IDENTITY FULL;