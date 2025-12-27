-- Add down_payment column to offers table
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS down_payment numeric DEFAULT 0;

COMMENT ON COLUMN public.offers.down_payment IS 'Acompte versé par le client, diminue le montant financé';