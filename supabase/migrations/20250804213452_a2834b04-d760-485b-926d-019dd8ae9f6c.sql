-- Add foreign key constraints for template_comments table
ALTER TABLE public.template_comments 
ADD CONSTRAINT fk_template_comments_created_by 
FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.template_comments 
ADD CONSTRAINT fk_template_comments_resolved_by 
FOREIGN KEY (resolved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Create RLS policy to allow reading profiles of comment creators
CREATE POLICY "Users can view comment creator profiles" 
ON public.profiles 
FOR SELECT 
USING (
  id IN (
    SELECT tc.created_by 
    FROM public.template_comments tc
    JOIN public.custom_pdf_templates cpt ON tc.template_id = cpt.id
    WHERE cpt.company_id = get_user_company_id()
  ) 
  OR id IN (
    SELECT tc.resolved_by 
    FROM public.template_comments tc
    JOIN public.custom_pdf_templates cpt ON tc.template_id = cpt.id
    WHERE cpt.company_id = get_user_company_id()
  )
  OR id = auth.uid()
);