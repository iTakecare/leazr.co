-- Créer des politiques RLS pour permettre l'accès aux données principales

-- Politique pour la table clients - accès basé sur company_id ou admin
CREATE POLICY "clients_access" ON public.clients
FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour la table offers - accès basé sur company_id ou admin
CREATE POLICY "offers_access" ON public.offers
FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour la table contracts - accès basé sur company_id ou admin
CREATE POLICY "contracts_access" ON public.contracts
FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour la table ambassadors - accès basé sur company_id ou admin
CREATE POLICY "ambassadors_access" ON public.ambassadors
FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour la table partners - accès basé sur company_id ou admin
CREATE POLICY "partners_access" ON public.partners
FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour la table leasers - accès basé sur company_id ou admin
CREATE POLICY "leasers_access" ON public.leasers
FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour la table profiles - accès à son propre profil ou admin
CREATE POLICY "profiles_access" ON public.profiles
FOR ALL USING (
  auth.uid() = id OR 
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour la table companies - admin seulement
CREATE POLICY "companies_access" ON public.companies
FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour les tables d'équipement des offres
CREATE POLICY "offer_equipment_access" ON public.offer_equipment
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offers 
    WHERE offers.id = offer_equipment.offer_id 
    AND (
      offers.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

CREATE POLICY "offer_equipment_attributes_access" ON public.offer_equipment_attributes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offer_equipment oe
    JOIN public.offers o ON oe.offer_id = o.id
    WHERE oe.id = offer_equipment_attributes.equipment_id 
    AND (
      o.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

CREATE POLICY "offer_equipment_specifications_access" ON public.offer_equipment_specifications
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offer_equipment oe
    JOIN public.offers o ON oe.offer_id = o.id
    WHERE oe.id = offer_equipment_specifications.equipment_id 
    AND (
      o.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

-- Politique pour les notes d'offres
CREATE POLICY "offer_notes_access" ON public.offer_notes
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offers 
    WHERE offers.id = offer_notes.offer_id 
    AND (
      offers.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

-- Politique pour les logs de workflow des offres
CREATE POLICY "offer_workflow_logs_access" ON public.offer_workflow_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offers 
    WHERE offers.id = offer_workflow_logs.offer_id 
    AND (
      offers.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

-- Politique pour les demandes d'informations d'offres
CREATE POLICY "offer_info_requests_access" ON public.offer_info_requests
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.offers 
    WHERE offers.id = offer_info_requests.offer_id 
    AND (
      offers.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

-- Politique pour les collaborateurs (liés aux clients)
CREATE POLICY "collaborators_access" ON public.collaborators
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.clients 
    WHERE clients.id = collaborators.client_id 
    AND (
      clients.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

-- Politique pour les relations ambassador-clients
CREATE POLICY "ambassador_clients_access" ON public.ambassador_clients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.ambassadors a
    WHERE a.id = ambassador_clients.ambassador_id 
    AND (
      a.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

-- Politique pour les relations partner-clients
CREATE POLICY "partner_clients_access" ON public.partner_clients
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_clients.partner_id 
    AND (
      p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

-- Politique pour les commissions des partners
CREATE POLICY "partner_commissions_access" ON public.partner_commissions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_commissions.partner_id 
    AND (
      p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

-- Politique pour les ranges de leasers
CREATE POLICY "leaser_ranges_access" ON public.leaser_ranges
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.leasers l
    WHERE l.id = leaser_ranges.leaser_id 
    AND (
      l.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

-- Politique pour les logs de workflow des contrats
CREATE POLICY "contract_workflow_logs_access" ON public.contract_workflow_logs
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.contracts 
    WHERE contracts.id = contract_workflow_logs.contract_id 
    AND (
      contracts.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
    )
  )
);

-- Politique pour les modules de company
CREATE POLICY "company_modules_access" ON public.company_modules
FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour les subscriptions
CREATE POLICY "subscriptions_access" ON public.subscriptions
FOR ALL USING (
  company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour les permissions utilisateur
CREATE POLICY "user_permissions_access" ON public.user_permissions
FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour les prix de variantes de produits
CREATE POLICY "product_variant_prices_access" ON public.product_variant_prices
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_variant_prices.product_id 
    AND (
      p.company_id = (SELECT company_id FROM public.profiles WHERE id = auth.uid()) OR
      EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin')) OR
      (p.active = true AND p.admin_only = false)
    )
  )
);

-- Politique pour les logs d'erreurs (admin seulement)
CREATE POLICY "error_logs_access" ON public.error_logs
FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour les demandes admin en attente (admin seulement)
CREATE POLICY "admin_pending_requests_access" ON public.admin_pending_requests
FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);

-- Politique pour les configs WooCommerce (propriétaire ou admin)
CREATE POLICY "woocommerce_configs_access" ON public.woocommerce_configs
FOR ALL USING (
  user_id = auth.uid() OR
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
);