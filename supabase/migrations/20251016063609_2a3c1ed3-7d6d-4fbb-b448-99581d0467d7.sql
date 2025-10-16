-- Enable RLS on offer_upload_links table
ALTER TABLE public.offer_upload_links ENABLE ROW LEVEL SECURITY;

-- Policy: Company admins can manage upload links for their offers
CREATE POLICY "Company admins manage upload links"
ON public.offer_upload_links
FOR ALL
USING (
  offer_id IN (
    SELECT id FROM public.offers WHERE company_id = get_user_company_id()
  )
  OR is_admin_optimized()
)
WITH CHECK (
  offer_id IN (
    SELECT id FROM public.offers WHERE company_id = get_user_company_id()
  )
  OR is_admin_optimized()
);

-- Enable RLS on offer_documents table
ALTER TABLE public.offer_documents ENABLE ROW LEVEL SECURITY;

-- Policy: Company users can access documents for their company's offers
CREATE POLICY "Company users access own documents"
ON public.offer_documents
FOR ALL
USING (
  offer_id IN (
    SELECT id FROM public.offers WHERE company_id = get_user_company_id()
  )
  OR is_admin_optimized()
)
WITH CHECK (
  offer_id IN (
    SELECT id FROM public.offers WHERE company_id = get_user_company_id()
  )
  OR is_admin_optimized()
);

-- Policy: Clients can view documents for their own offers
CREATE POLICY "Clients view own offer documents"
ON public.offer_documents
FOR SELECT
USING (
  offer_id IN (
    SELECT id FROM public.offers WHERE client_id IN (
      SELECT id FROM public.clients WHERE user_id = auth.uid()
    )
  )
);