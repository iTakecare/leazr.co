-- Créer les tables pour le système de chat en temps réel

-- Table pour les conversations de chat
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  visitor_id TEXT,
  visitor_name TEXT NOT NULL,
  visitor_email TEXT,
  agent_id UUID,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, active, closed
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table pour les messages de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'agent')),
  sender_id UUID, -- UUID pour les agents, null pour les visiteurs
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Activer RLS
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour chat_conversations
CREATE POLICY "chat_conversations_company_access" 
ON public.chat_conversations 
FOR ALL 
USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Politiques RLS pour chat_messages
CREATE POLICY "chat_messages_conversation_access" 
ON public.chat_messages 
FOR ALL 
USING (
  conversation_id IN (
    SELECT id FROM public.chat_conversations 
    WHERE company_id = get_user_company_id() OR is_admin_optimized()
  )
);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.update_chat_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_updated_at();

-- Index pour optimiser les performances
CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_id ON public.chat_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);