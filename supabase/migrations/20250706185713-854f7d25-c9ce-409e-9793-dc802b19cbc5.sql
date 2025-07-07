-- Ajouter les politiques RLS et index pour les tables de chat

-- Politiques RLS pour chat_conversations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'chat_conversations' 
    AND policyname = 'chat_conversations_access'
  ) THEN
    CREATE POLICY "chat_conversations_access" 
    ON public.chat_conversations 
    FOR ALL 
    USING (company_id = get_user_company_id() OR is_admin_optimized());
  END IF;
END $$;

-- Politiques RLS pour chat_messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'chat_messages' 
    AND policyname = 'chat_messages_access'
  ) THEN
    CREATE POLICY "chat_messages_access" 
    ON public.chat_messages 
    FOR ALL 
    USING (
      conversation_id IN (
        SELECT id FROM public.chat_conversations 
        WHERE company_id = get_user_company_id() OR is_admin_optimized()
      )
    );
  END IF;
END $$;

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_id ON public.chat_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);