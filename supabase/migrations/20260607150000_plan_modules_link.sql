-- Lie la politique tarifaire aux modules Leazr (modèle HYBRIDE) :
--   • chaque plan INCLUT un socle de modules (table plan_modules),
--   • les modules supplémentaires activés sont des ADD-ONS payants au tarif du
--     tier (modules.price_starter/pro/business).
-- Les modules « core » (modules.is_core) sont inclus partout, implicitement.

-- 1) S'assurer que les colonnes de prix par tier existent (en euros).
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS price_starter  numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_pro      numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_business numeric NOT NULL DEFAULT 0;

-- 2) Table de liaison plan ↔ modules inclus.
CREATE TABLE IF NOT EXISTS public.plan_modules (
  plan_id     text NOT NULL,                       -- 'starter' | 'pro' | 'business'
  module_slug text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (plan_id, module_slug)
);

-- 3) Socle inclus par défaut (l'admin pourra éditer ensuite).
--    Starter : core seulement · Pro : core + offers/invoicing/chat ·
--    Business : tout le catalogue connu.
INSERT INTO public.plan_modules (plan_id, module_slug) VALUES
  ('starter','calculator'),('starter','catalog'),('starter','crm'),
  ('pro','calculator'),('pro','catalog'),('pro','crm'),
  ('pro','offers'),('pro','invoicing'),('pro','chat'),
  ('business','calculator'),('business','catalog'),('business','crm'),
  ('business','offers'),('business','contracts'),('business','invoicing'),
  ('business','chat'),('business','equipment'),('business','public_catalog'),
  ('business','ai_assistant'),('business','fleet_generator'),('business','support')
ON CONFLICT (plan_id, module_slug) DO NOTHING;

-- 4) RLS : grille publique en lecture, écriture réservée au super_admin.
ALTER TABLE public.plan_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_modules_public_read ON public.plan_modules;
CREATE POLICY plan_modules_public_read
  ON public.plan_modules FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS plan_modules_admin_write ON public.plan_modules;
CREATE POLICY plan_modules_admin_write
  ON public.plan_modules FOR ALL
  TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());

-- 5) Écriture des modules (catalogue global) réservée au super_admin également.
--    (La table modules n'avait pas de policy d'écriture explicite côté admin.)
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS modules_public_read ON public.modules;
CREATE POLICY modules_public_read
  ON public.modules FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS modules_admin_write ON public.modules;
CREATE POLICY modules_admin_write
  ON public.modules FOR ALL
  TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());
