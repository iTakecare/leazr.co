-- Add fixed_rate column to commission_levels table
ALTER TABLE public.commission_levels
ADD COLUMN IF NOT EXISTS fixed_rate numeric;

-- Add comment explaining the fixed_rate column
COMMENT ON COLUMN public.commission_levels.fixed_rate IS 'Fixed commission rate percentage used when calculation_mode is monthly_payment. Example: 100 means 100% of monthly payment';

-- Update calculation_mode to accept the new 'monthly_payment' value
-- Note: In PostgreSQL, text columns don't have constraints on specific values by default
-- If there was a CHECK constraint, we would need to drop and recreate it
-- For now, the application layer will handle validation