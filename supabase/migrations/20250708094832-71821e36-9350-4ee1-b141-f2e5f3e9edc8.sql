
-- Créer la table pour les tickets de support SaaS
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'technical', 'billing', 'feature_request')),
  assigned_to UUID REFERENCES auth.users(id),
  created_by_email TEXT NOT NULL,
  created_by_name TEXT NOT NULL,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Créer la table pour les métriques SaaS historiques
CREATE TABLE IF NOT EXISTS public.saas_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  total_companies INTEGER NOT NULL DEFAULT 0,
  active_subscriptions INTEGER NOT NULL DEFAULT 0,
  trial_companies INTEGER NOT NULL DEFAULT 0,
  monthly_revenue NUMERIC NOT NULL DEFAULT 0,
  new_signups INTEGER NOT NULL DEFAULT 0,
  churned_companies INTEGER NOT NULL DEFAULT 0,
  support_tickets_opened INTEGER NOT NULL DEFAULT 0,
  support_tickets_resolved INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(date)
);

-- Améliorer la table modules avec plus de détails
ALTER TABLE public.modules 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS features TEXT[],
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'core';

-- Mettre à jour les modules existants avec des prix et fonctionnalités
UPDATE public.modules SET 
  price = CASE 
    WHEN slug = 'ai_assistant' THEN 29
    WHEN slug = 'fleet_generator' THEN 19
    WHEN slug = 'contracts' THEN 15
    WHEN slug = 'support' THEN 9
    ELSE 0
  END,
  features = CASE 
    WHEN slug = 'calculator' THEN ARRAY['Calculs automatisés', 'Simulation temps réel', 'Export PDF']
    WHEN slug = 'catalog' THEN ARRAY['Gestion produits', 'Variantes', 'Import/Export']
    WHEN slug = 'crm' THEN ARRAY['Gestion clients', 'Suivi commercial', 'Rapports']
    WHEN slug = 'ai_assistant' THEN ARRAY['Assistant IA', 'Génération de contenu', 'Recommandations']
    WHEN slug = 'fleet_generator' THEN ARRAY['Génération automatique', 'Optimisation', 'Analyse prédictive']
    WHEN slug = 'contracts' THEN ARRAY['Contrats numériques', 'Signature électronique', 'Suivi']
    WHEN slug = 'support' THEN ARRAY['SAV intégré', 'Tickets', 'Chat en direct']
    ELSE ARRAY[]::TEXT[]
  END,
  category = CASE 
    WHEN is_core = true THEN 'core'
    WHEN slug IN ('ai_assistant', 'fleet_generator') THEN 'premium'
    ELSE 'standard'
  END;

-- Activer RLS sur les nouvelles tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_metrics ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour support_tickets
CREATE POLICY "Support tickets admin access" 
ON public.support_tickets 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Politiques RLS pour saas_metrics  
CREATE POLICY "SaaS metrics admin access" 
ON public.saas_metrics 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Insérer des données de test pour les tickets de support
INSERT INTO public.support_tickets (company_id, title, description, status, priority, category, created_by_email, created_by_name) 
SELECT 
  c.id,
  CASE 
    WHEN random() < 0.3 THEN 'Problème de connexion'
    WHEN random() < 0.6 THEN 'Question sur la facturation'
    ELSE 'Demande de nouvelle fonctionnalité'
  END,
  CASE 
    WHEN random() < 0.3 THEN 'Impossible de me connecter à mon compte depuis ce matin'
    WHEN random() < 0.6 THEN 'Je souhaite modifier mon plan d''abonnement'
    ELSE 'Serait-il possible d''ajouter une fonction d''export Excel ?'
  END,
  CASE 
    WHEN random() < 0.4 THEN 'open'
    WHEN random() < 0.7 THEN 'in_progress'
    WHEN random() < 0.9 THEN 'resolved'
    ELSE 'closed'
  END,
  CASE 
    WHEN random() < 0.2 THEN 'urgent'
    WHEN random() < 0.5 THEN 'high'
    WHEN random() < 0.8 THEN 'medium'
    ELSE 'low'
  END,
  CASE 
    WHEN random() < 0.3 THEN 'technical'
    WHEN random() < 0.6 THEN 'billing'
    WHEN random() < 0.8 THEN 'feature_request'
    ELSE 'general'
  END,
  COALESCE(p.email, 'contact@example.com'),
  COALESCE(p.first_name || ' ' || p.last_name, 'Client Test')
FROM public.companies c
LEFT JOIN public.profiles p ON p.company_id = c.id AND p.role = 'admin'
LIMIT 15;

-- Insérer des métriques historiques pour les 30 derniers jours
INSERT INTO public.saas_metrics (date, total_companies, active_subscriptions, trial_companies, monthly_revenue, new_signups, churned_companies, support_tickets_opened, support_tickets_resolved)
SELECT 
  date_series.date,
  (SELECT COUNT(*) FROM public.companies WHERE created_at::date <= date_series.date) as total_companies,
  (SELECT COUNT(*) FROM public.companies WHERE account_status = 'active' AND created_at::date <= date_series.date) as active_subscriptions,
  (SELECT COUNT(*) FROM public.companies WHERE account_status = 'trial' AND created_at::date <= date_series.date) as trial_companies,
  (SELECT 
    COALESCE(SUM(CASE 
      WHEN plan = 'starter' THEN 49
      WHEN plan = 'pro' THEN 149  
      WHEN plan = 'business' THEN 299
      ELSE 0
    END), 0)
    FROM public.companies 
    WHERE account_status = 'active' AND created_at::date <= date_series.date
  ) as monthly_revenue,
  (SELECT COUNT(*) FROM public.companies WHERE created_at::date = date_series.date) as new_signups,
  FLOOR(random() * 3) as churned_companies,
  FLOOR(random() * 8) as support_tickets_opened,
  FLOOR(random() * 6) as support_tickets_resolved
FROM (
  SELECT (CURRENT_DATE - interval '30 days' + interval '1 day' * generate_series(0, 30))::date as date
) date_series
ON CONFLICT (date) DO NOTHING;

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_support_tickets_updated_at();
