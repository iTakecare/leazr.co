-- Activer RLS sur la table woocommerce_configs qui semble avoir des politiques mais pas RLS activé
ALTER TABLE public.woocommerce_configs ENABLE ROW LEVEL SECURITY;

-- Créer une politique simple pour woocommerce_configs (admin seulement)
CREATE POLICY "Admin only woocommerce_configs" ON public.woocommerce_configs FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Vérifier et activer RLS sur toutes les autres tables qui pourraient avoir des politiques sans RLS
ALTER TABLE public.admin_pending_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaser_ranges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leasers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_equipment_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_equipment_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_info_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offer_workflow_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variant_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;