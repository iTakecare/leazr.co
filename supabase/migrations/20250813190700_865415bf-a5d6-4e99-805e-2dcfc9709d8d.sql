-- Add calculation_mode column to commission_levels table
ALTER TABLE public.commission_levels 
ADD COLUMN calculation_mode text NOT NULL DEFAULT 'margin';

-- Add check constraint for valid calculation modes
ALTER TABLE public.commission_levels 
ADD CONSTRAINT commission_levels_calculation_mode_check 
CHECK (calculation_mode IN ('margin', 'purchase_price'));

-- Add comment to explain the column
COMMENT ON COLUMN public.commission_levels.calculation_mode IS 'Commission calculation mode: margin (percentage of margin) or purchase_price (percentage of purchase price)';