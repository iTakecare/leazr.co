-- Create RLS policy to allow public access to offers via valid upload tokens
CREATE POLICY "Public access for valid upload tokens" ON public.offers 
FOR SELECT 
USING (
  id IN (
    SELECT offer_id 
    FROM public.offer_upload_links 
    WHERE expires_at > now() 
    AND used_at IS NULL
  )
);