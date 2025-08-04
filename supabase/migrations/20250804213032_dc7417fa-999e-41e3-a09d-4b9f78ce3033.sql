-- Add foreign key constraint between template_collaborators and profiles
ALTER TABLE public.template_collaborators 
ADD CONSTRAINT fk_template_collaborators_user_id 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Create RLS policy to allow reading profiles of collaborators
CREATE POLICY "Users can view collaborator profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT tc.user_id 
    FROM public.template_collaborators tc
    JOIN public.custom_pdf_templates cpt ON tc.template_id = cpt.id
    WHERE cpt.company_id = get_user_company_id()
  ) 
  OR id = auth.uid()
);