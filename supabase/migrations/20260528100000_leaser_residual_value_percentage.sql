-- Add residual value percentage on leasers (used for contract buyback calculation)
ALTER TABLE public.leasers
  ADD COLUMN IF NOT EXISTS residual_value_percentage numeric NOT NULL DEFAULT 3;

COMMENT ON COLUMN public.leasers.residual_value_percentage IS
  'Pourcentage de valeur résiduelle appliqué au montant financé lors du rachat de contrat (ex: 3 = 3%)';
