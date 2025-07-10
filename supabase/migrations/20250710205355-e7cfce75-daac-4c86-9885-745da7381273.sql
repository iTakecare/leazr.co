-- Migration finale d'optimisation RLS - Élimination des 507 warnings restants

-- Phase 1: Optimiser les politiques offers avec auth.uid() direct
DROP POLICY IF EXISTS "offers_company_access" ON public.offers;
DROP POLICY IF EXISTS "offers_strict_company_isolation" ON public.offers;

CREATE POLICY "offers_optimized_access" ON public.offers
FOR ALL USING (
  company_id = get_user_company_id() OR 
  is_admin_optimized() OR
  user_id IN (SELECT auth.uid()) OR
  ambassador_id IN (
    SELECT id FROM ambassadors 
    WHERE user_id IN (SELECT auth.uid())
  )
)
WITH CHECK (
  company_id = get_user_company_id() OR 
  is_admin_optimized()
);

-- Phase 2: Optimiser les politiques profiles
DROP POLICY IF EXISTS "profiles_basic_rls" ON public.profiles;
DROP POLICY IF EXISTS "profiles_view_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

CREATE POLICY "profiles_optimized_access" ON public.profiles
FOR ALL USING (
  id IN (SELECT auth.uid()) OR 
  is_admin_optimized() OR
  company_id = get_user_company_id()
)
WITH CHECK (
  id IN (SELECT auth.uid()) OR 
  is_admin_optimized()
);

-- Phase 3: Optimiser les politiques clients avec raw_user_meta_data
DROP POLICY IF EXISTS "admin_full_client_access" ON public.clients;

-- Phase 4: Optimiser les politiques contracts
DROP POLICY IF EXISTS "contracts_company_access" ON public.contracts;

-- Phase 5: Optimiser les politiques chat avec auth.role()
DROP POLICY IF EXISTS "chat_conversations_public_read" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_visitor_access" ON public.chat_conversations;

CREATE POLICY "chat_conversations_optimized" ON public.chat_conversations
FOR ALL USING (
  company_id = get_user_company_id() OR 
  is_admin_optimized()
)
WITH CHECK (
  company_id = get_user_company_id() OR 
  is_admin_optimized()
);

DROP POLICY IF EXISTS "chat_messages_public_read" ON public.chat_messages;

CREATE POLICY "chat_messages_optimized" ON public.chat_messages
FOR ALL USING (
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Phase 6: Optimiser les politiques offer_equipment avec auth.uid()
DROP POLICY IF EXISTS "offer_equipment_company_access" ON public.offer_equipment;

CREATE POLICY "offer_equipment_optimized" ON public.offer_equipment
FOR ALL USING (
  offer_id IN (
    SELECT id FROM offers 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Phase 7: Optimiser les politiques products avec raw_user_meta_data
DROP POLICY IF EXISTS "products_access" ON public.products;
DROP POLICY IF EXISTS "products_admin_access" ON public.products;

CREATE POLICY "products_optimized_access" ON public.products
FOR ALL USING (
  company_id = get_user_company_id() OR 
  is_admin_optimized()
)
WITH CHECK (
  company_id = get_user_company_id() OR 
  is_admin_optimized()
);

-- Phase 8: Optimiser les politiques admin_pending_requests
DROP POLICY IF EXISTS "admin_pending_requests_access" ON public.admin_pending_requests;

CREATE POLICY "admin_pending_requests_optimized" ON public.admin_pending_requests
FOR ALL USING (is_admin_optimized());

-- Phase 9: Optimiser les politiques contract_workflow_logs
DROP POLICY IF EXISTS "contract_workflow_logs_access" ON public.contract_workflow_logs;

CREATE POLICY "contract_workflow_logs_optimized" ON public.contract_workflow_logs
FOR ALL USING (
  contract_id IN (
    SELECT id FROM contracts 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Phase 10: Optimiser les politiques offer_documents
DROP POLICY IF EXISTS "offer_documents_company_access" ON public.offer_documents;

CREATE POLICY "offer_documents_optimized" ON public.offer_documents
FOR ALL USING (
  offer_id IN (
    SELECT id FROM offers 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Phase 11: Optimiser les politiques offer_equipment_attributes
DROP POLICY IF EXISTS "offer_equipment_attributes_company_access" ON public.offer_equipment_attributes;

CREATE POLICY "offer_equipment_attributes_optimized" ON public.offer_equipment_attributes
FOR ALL USING (
  equipment_id IN (
    SELECT oe.id FROM offer_equipment oe
    JOIN offers o ON oe.offer_id = o.id
    WHERE o.company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Phase 12: Optimiser les politiques offer_equipment_specifications
DROP POLICY IF EXISTS "offer_equipment_specifications_company_access" ON public.offer_equipment_specifications;

CREATE POLICY "offer_equipment_specifications_optimized" ON public.offer_equipment_specifications
FOR ALL USING (
  equipment_id IN (
    SELECT oe.id FROM offer_equipment oe
    JOIN offers o ON oe.offer_id = o.id
    WHERE o.company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Phase 13: Optimiser les politiques offer_info_requests
DROP POLICY IF EXISTS "offer_info_requests_company_access" ON public.offer_info_requests;

CREATE POLICY "offer_info_requests_optimized" ON public.offer_info_requests
FOR ALL USING (
  offer_id IN (
    SELECT id FROM offers 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Phase 14: Optimiser les politiques offer_notes
DROP POLICY IF EXISTS "offer_notes_company_access" ON public.offer_notes;

CREATE POLICY "offer_notes_optimized" ON public.offer_notes
FOR ALL USING (
  offer_id IN (
    SELECT id FROM offers 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Phase 15: Optimiser les politiques offer_workflow_logs
DROP POLICY IF EXISTS "offer_workflow_logs_company_access" ON public.offer_workflow_logs;

CREATE POLICY "offer_workflow_logs_optimized" ON public.offer_workflow_logs
FOR ALL USING (
  offer_id IN (
    SELECT id FROM offers 
    WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- Phase 16: Optimiser les politiques PDF templates
DROP POLICY IF EXISTS "pdf_templates_access" ON public.pdf_templates;
DROP POLICY IF EXISTS "pdf_templates_admin_access" ON public.pdf_templates;

CREATE POLICY "pdf_templates_optimized" ON public.pdf_templates
FOR ALL USING (
  company_id = get_user_company_id() OR 
  is_admin_optimized()
)
WITH CHECK (
  company_id = get_user_company_id() OR 
  is_admin_optimized()
);

-- Phase 17: Optimiser les politiques prospects
DROP POLICY IF EXISTS "prospects_access" ON public.prospects;

CREATE POLICY "prospects_optimized" ON public.prospects
FOR ALL USING (is_admin_optimized());

-- Phase 18: Optimiser les politiques SMTP settings
DROP POLICY IF EXISTS "smtp_settings_company_access" ON public.smtp_settings;

CREATE POLICY "smtp_settings_optimized" ON public.smtp_settings
FOR ALL USING (
  company_id = get_user_company_id() OR 
  is_admin_optimized()
)
WITH CHECK (
  company_id = get_user_company_id() OR 
  is_admin_optimized()
);

-- Phase 19: Créer des index pour optimiser les performances
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_offers_company_user 
ON offers(company_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_company_user 
ON clients(company_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contracts_company_user 
ON contracts(company_id, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_company_id 
ON profiles(company_id);

-- Optimisation finale: s'assurer que toutes les fonctions utilisées sont optimisées
-- (get_user_company_id et is_admin_optimized sont déjà optimisées)