-- Politique tarifaire SaaS éditable depuis le SaaS admin.
-- Jusqu'ici la grille était une constante figée (src/config/saasPlans.ts).
-- On la persiste en DB pour que le super_admin plateforme puisse l'éditer
-- (prix, nom, limites, features) sans redéploiement. Le fichier de config reste
-- le fallback typé / valeurs par défaut.

CREATE TABLE IF NOT EXISTS public.saas_plans (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     text NOT NULL UNIQUE,                 -- 'starter' | 'pro' | 'business'
  name        text NOT NULL,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  description text NOT NULL DEFAULT '',
  features    jsonb NOT NULL DEFAULT '[]'::jsonb,   -- string[]
  max_users   integer NOT NULL DEFAULT -1,          -- -1 = illimité
  max_modules integer NOT NULL DEFAULT -1,          -- -1 = illimité
  popular     boolean NOT NULL DEFAULT false,
  sort_order  integer NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed des 3 plans officiels (79 / 129 / 199 €).
INSERT INTO public.saas_plans (plan_id, name, price_cents, description, features, max_users, max_modules, popular, sort_order)
VALUES
  ('starter',  'Starter',  7900,  'Pour débuter',
     '["1 utilisateur","1 module","Support par email"]'::jsonb, 1, 1, false, 1),
  ('pro',      'Pro',      12900, 'Pour grandir',
     '["5 utilisateurs","3 modules","Support prioritaire"]'::jsonb, 5, 3, true, 2),
  ('business', 'Business', 19900, 'Pour l''entreprise',
     '["10 utilisateurs","Tous les modules","Support dédié"]'::jsonb, 10, -1, false, 3)
ON CONFLICT (plan_id) DO NOTHING;

-- updated_at auto
CREATE OR REPLACE FUNCTION public.touch_saas_plans_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_saas_plans_updated_at ON public.saas_plans;
CREATE TRIGGER trg_saas_plans_updated_at
  BEFORE UPDATE ON public.saas_plans
  FOR EACH ROW EXECUTE FUNCTION public.touch_saas_plans_updated_at();

-- RLS : la grille tarifaire est une info publique (pages marketing, écran
-- d'abonnement) → lecture pour tous. Écriture réservée au super_admin plateforme.
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS saas_plans_public_read ON public.saas_plans;
CREATE POLICY saas_plans_public_read
  ON public.saas_plans FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS saas_plans_admin_write ON public.saas_plans;
CREATE POLICY saas_plans_admin_write
  ON public.saas_plans FOR ALL
  TO authenticated
  USING (public.is_saas_admin())
  WITH CHECK (public.is_saas_admin());
