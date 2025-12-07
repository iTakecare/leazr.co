-- Ajouter la colonne offer_id à la table invoices pour lier les factures aux offres d'achat
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.offers(id) ON DELETE SET NULL;

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_invoices_offer_id ON public.invoices(offer_id);

-- Commentaire pour documenter
COMMENT ON COLUMN public.invoices.offer_id IS 'Référence vers l''offre d''achat associée (pour les offres is_purchase=true)';