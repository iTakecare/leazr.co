-- Créer des index pour améliorer les performances des tables de chat
CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_id ON public.chat_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_agent_id ON public.chat_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_agent_status_agent_id ON public.chat_agent_status(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_status_company_id ON public.chat_agent_status(company_id);

-- Créer des triggers pour la mise à jour automatique des timestamps
CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_updated_at();

CREATE TRIGGER update_chat_agent_status_updated_at
  BEFORE UPDATE ON public.chat_agent_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_updated_at();

-- Activer la réplication en temps réel pour les tables de chat
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_agent_status REPLICA IDENTITY FULL;

-- Ajouter les tables à la publication realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;  
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_agent_status;

-- Créer les politiques RLS pour les tables de chat
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_agent_status ENABLE ROW LEVEL SECURITY;

-- Politiques pour chat_messages  
CREATE POLICY "chat_messages_conversation_access"
ON public.chat_messages
FOR ALL
USING (
  conversation_id IN (
    SELECT id FROM public.chat_conversations 
    WHERE company_id = get_user_company_id() OR is_admin_optimized()
  )
);