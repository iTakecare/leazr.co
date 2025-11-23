-- =====================================================
-- Migration : Support des Packs Personnalisés iTakecare
-- =====================================================

-- 1. Créer la table pour les packs personnalisés
CREATE TABLE IF NOT EXISTS public.offer_custom_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.offers(id) ON DELETE CASCADE,
  custom_pack_id UUID NOT NULL,
  pack_name TEXT NOT NULL,
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  original_monthly_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discounted_monthly_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  monthly_savings NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_offer_custom_packs_offer_id ON public.offer_custom_packs(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_custom_packs_custom_pack_id ON public.offer_custom_packs(custom_pack_id);

-- 2. Étendre la table offer_equipment avec les colonnes pour les packs
ALTER TABLE public.offer_equipment
ADD COLUMN IF NOT EXISTS custom_pack_id UUID REFERENCES public.offer_custom_packs(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pack_discount_percentage INTEGER DEFAULT 0 CHECK (pack_discount_percentage >= 0 AND pack_discount_percentage <= 100),
ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS is_part_of_custom_pack BOOLEAN DEFAULT FALSE;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_offer_equipment_custom_pack_id ON public.offer_equipment(custom_pack_id);

-- 3. Enable RLS pour offer_custom_packs
ALTER TABLE public.offer_custom_packs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy pour offer_custom_packs (accès basé sur la company)
CREATE POLICY "offer_custom_packs_company_access" 
ON public.offer_custom_packs
FOR ALL
USING (
  offer_id IN (
    SELECT id FROM public.offers 
    WHERE company_id = get_user_company_id() OR is_admin_optimized()
  )
);

-- 5. Trigger pour updated_at sur offer_custom_packs
CREATE OR REPLACE FUNCTION public.update_offer_custom_packs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER update_offer_custom_packs_updated_at
BEFORE UPDATE ON public.offer_custom_packs
FOR EACH ROW
EXECUTE FUNCTION public.update_offer_custom_packs_updated_at();

-- 6. Commentaires pour documentation
COMMENT ON TABLE public.offer_custom_packs IS 'Stocke les métadonnées des packs personnalisés créés par les clients iTakecare avec réductions progressives';
COMMENT ON COLUMN public.offer_custom_packs.custom_pack_id IS 'UUID du pack généré par le frontend iTakecare';
COMMENT ON COLUMN public.offer_custom_packs.discount_percentage IS 'Pourcentage de réduction appliquée au pack (2-5%)';
COMMENT ON COLUMN public.offer_custom_packs.monthly_savings IS 'Économie mensuelle réalisée grâce à la réduction du pack';

COMMENT ON COLUMN public.offer_equipment.custom_pack_id IS 'Référence au pack personnalisé dont fait partie cet équipement';
COMMENT ON COLUMN public.offer_equipment.pack_discount_percentage IS 'Pourcentage de réduction du pack appliqué à cet équipement';
COMMENT ON COLUMN public.offer_equipment.original_unit_price IS 'Prix unitaire mensuel avant application de la réduction du pack';
COMMENT ON COLUMN public.offer_equipment.is_part_of_custom_pack IS 'Indique si cet équipement fait partie d''un pack personnalisé';