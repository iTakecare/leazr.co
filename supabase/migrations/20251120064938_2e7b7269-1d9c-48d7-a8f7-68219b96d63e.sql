-- Fix CRITICAL: Enable RLS on company_metrics_backup table
-- This table stores company metrics but has no Row Level Security enabled
-- allowing unrestricted access to all company data

ALTER TABLE public.company_metrics_backup ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view metrics for their own company
CREATE POLICY "Users can only see their company metrics"
ON public.company_metrics_backup
FOR SELECT
USING (
  company_id IN (
    SELECT company_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);

-- Policy: Only admins can modify company metrics
CREATE POLICY "Only admins can manage company metrics"
ON public.company_metrics_backup
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);