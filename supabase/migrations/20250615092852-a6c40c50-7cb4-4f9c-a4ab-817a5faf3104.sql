-- Corriger les erreurs RLS restantes identifiées dans le Security Advisor

-- Tables qui nécessitent RLS mais n'en ont pas encore

-- 1. leaser_ranges (relation avec leasers - accès company)
ALTER TABLE public.leaser_ranges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leaser_ranges_company_access" ON public.leaser_ranges
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.leasers l 
    WHERE l.id = leaser_ranges.leaser_id 
    AND (l.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

-- 2. offer_equipment_attributes (relation avec offer_equipment)
ALTER TABLE public.offer_equipment_attributes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer_equipment_attributes_company_access" ON public.offer_equipment_attributes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offer_equipment oe
    JOIN public.offers o ON oe.offer_id = o.id
    WHERE oe.id = offer_equipment_attributes.equipment_id
    AND (o.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

-- 3. woocommerce_configs (configuration utilisateur)
ALTER TABLE public.woocommerce_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "woocommerce_configs_user_access" ON public.woocommerce_configs
FOR ALL USING (user_id = auth.uid() OR public.is_admin());

-- 4. offer_notes (relation avec offers)
ALTER TABLE public.offer_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer_notes_company_access" ON public.offer_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_notes.offer_id
    AND (o.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

-- 5. offer_equipment (relation avec offers)
ALTER TABLE public.offer_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer_equipment_company_access" ON public.offer_equipment
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_equipment.offer_id
    AND (o.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

-- 6. offer_equipment_specifications (relation avec offer_equipment)
ALTER TABLE public.offer_equipment_specifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer_equipment_specifications_company_access" ON public.offer_equipment_specifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offer_equipment oe
    JOIN public.offers o ON oe.offer_id = o.id
    WHERE oe.id = offer_equipment_specifications.equipment_id
    AND (o.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

-- 7. offer_workflow_logs (relation avec offers)
ALTER TABLE public.offer_workflow_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "offer_workflow_logs_company_access" ON public.offer_workflow_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offers o
    WHERE o.id = offer_workflow_logs.offer_id
    AND (o.company_id = public.get_user_company_id() OR public.is_admin())
  )
);

-- Note: admin_pending_requests est une vue (SECURITY DEFINER View) donc pas besoin de RLS