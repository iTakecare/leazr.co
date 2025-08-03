-- Create RLS policy to allow public access to companies via valid upload tokens
CREATE POLICY "Public access to companies via valid upload tokens" ON public.companies 
FOR SELECT 
USING (
  id IN (
    SELECT DISTINCT o.company_id
    FROM public.offers o
    JOIN public.offer_upload_links oul ON o.id = oul.offer_id
    WHERE oul.expires_at > now() 
    AND oul.used_at IS NULL
  )
);