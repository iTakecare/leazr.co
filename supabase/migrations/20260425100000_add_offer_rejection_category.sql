BEGIN;

-- Catégorie typée du motif de refus + lien vers une éventuelle offre précédente
-- (ex: re-soumission d'un dossier "jeune entreprise" enrichi de docs financiers).
ALTER TABLE public.offers
  ADD COLUMN IF NOT EXISTS rejection_category text,
  ADD COLUMN IF NOT EXISTS previous_offer_id uuid
    REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TABLE public.offers
  DROP CONSTRAINT IF EXISTS offers_rejection_category_check;

ALTER TABLE public.offers
  ADD CONSTRAINT offers_rejection_category_check
  CHECK (
    rejection_category IS NULL
    OR rejection_category IN (
      'fraud',
      'young_company',
      'private_client',
      'financial_situation',
      'other'
    )
  );

COMMENT ON COLUMN public.offers.rejection_category IS
  'Catégorie typée du motif de refus (NULL si non refusée). Permet de filtrer les dossiers à relancer (ex: young_company → demande KYC renforcé).';

COMMENT ON COLUMN public.offers.previous_offer_id IS
  'Référence vers l''offre précédente en cas de re-soumission après refus (ex: jeune entreprise relancée avec docs financiers complémentaires).';

CREATE INDEX IF NOT EXISTS idx_offers_rejection_category
  ON public.offers (company_id, rejection_category)
  WHERE rejection_category IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_offers_previous_offer_id
  ON public.offers (previous_offer_id)
  WHERE previous_offer_id IS NOT NULL;

COMMIT;
