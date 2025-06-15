-- Enable RLS on ambassadors table if not already enabled
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;

-- Create policies for ambassadors table
CREATE POLICY "Ambassadors are viewable by company members" 
ON public.ambassadors 
FOR SELECT 
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Company admins can insert ambassadors" 
ON public.ambassadors 
FOR INSERT 
WITH CHECK (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Company admins can update ambassadors" 
ON public.ambassadors 
FOR UPDATE 
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

CREATE POLICY "Company admins can delete ambassadors" 
ON public.ambassadors 
FOR DELETE 
USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);