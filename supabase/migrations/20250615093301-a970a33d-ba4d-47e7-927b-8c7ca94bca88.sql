-- Corriger les dernières erreurs RLS restantes

-- Tables de workflow et logs
ALTER TABLE public.contract_workflow_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contract_workflow_logs_company_access" ON public.contract_workflow_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.contracts c
    WHERE c.id = contract_workflow_logs.contract_id
    AND (c.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

-- Tables de produits et attributs
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_attributes_read_all" ON public.product_attributes
FOR SELECT USING (true);
CREATE POLICY "product_attributes_admin_write" ON public.product_attributes
FOR ALL USING (public.is_admin());

ALTER TABLE public.product_attribute_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_attribute_values_read_all" ON public.product_attribute_values
FOR SELECT USING (true);
CREATE POLICY "product_attribute_values_admin_write" ON public.product_attribute_values
FOR ALL USING (public.is_admin());

ALTER TABLE public.product_variant_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "product_variant_prices_company_access" ON public.product_variant_prices
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variant_prices.product_id
    AND (p.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

-- Tables système
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "error_logs_admin_only" ON public.error_logs
FOR ALL USING (public.is_admin());

ALTER TABLE public.pdf_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pdf_models_read_all" ON public.pdf_models
FOR SELECT USING (true);
CREATE POLICY "pdf_models_admin_write" ON public.pdf_models
FOR ALL USING (public.is_admin());

ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_modules_company_access" ON public.company_modules
FOR ALL USING (
  company_id = public.get_user_company_id() OR public.is_admin()
);

ALTER TABLE public.smtp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "smtp_settings_admin_only" ON public.smtp_settings
FOR ALL USING (public.is_admin());

-- Tables de relations clients
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collaborators_company_access" ON public.collaborators
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = collaborators.client_id
    AND (c.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

ALTER TABLE public.ambassador_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ambassador_clients_company_access" ON public.ambassador_clients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.ambassadors a
    WHERE a.id = ambassador_clients.ambassador_id
    AND (a.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

ALTER TABLE public.partner_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_clients_company_access" ON public.partner_clients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_clients.partner_id
    AND (p.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "partner_commissions_company_access" ON public.partner_commissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_commissions.partner_id
    AND (p.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

ALTER TABLE public.offer_info_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer_info_requests_company_access" ON public.offer_info_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_info_requests.offer_id
    AND (o.company_id = public.get_user_company_id() OR public.is_admin())
  )
);