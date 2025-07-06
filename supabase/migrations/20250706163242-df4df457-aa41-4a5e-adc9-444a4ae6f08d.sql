-- Compléter les politiques RLS pour le système de chat

-- Politique pour permettre aux conversations d'être créées et consultées par les visiteurs anonymes
CREATE POLICY "chat_conversations_visitor_access"
ON public.chat_conversations
FOR ALL
USING (true)
WITH CHECK (true);

-- Politique pour chat_agent_status
CREATE POLICY "chat_agent_status_company_access"
ON public.chat_agent_status
FOR ALL
USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Compléter les politiques pour chat_conversations pour les admins et agents
CREATE POLICY "chat_conversations_company_access"
ON public.chat_conversations
FOR ALL
USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);