-- Créer les tables pour le système de chat en direct

-- Table pour les conversations de chat
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  visitor_id TEXT, -- Pour les visiteurs anonymes
  client_id UUID, -- Pour les clients connectés
  agent_id UUID, -- Agent assigné
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'closed', 'abandoned')),
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_context JSONB DEFAULT '{}', -- Info sur la page visitée, produits vus, etc.
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_chat_conversations_company 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_conversations_client 
    FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL,
  CONSTRAINT fk_chat_conversations_agent 
    FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Table pour les messages de chat
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('visitor', 'agent', 'system')),
  sender_id UUID, -- ID de l'agent si sender_type = 'agent'
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'system')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_chat_messages_conversation 
    FOREIGN KEY (conversation_id) REFERENCES public.chat_conversations(id) ON DELETE CASCADE
);

-- Table pour le statut des agents de chat
CREATE TABLE IF NOT EXISTS public.chat_agent_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL UNIQUE,
  company_id UUID NOT NULL,
  is_online BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT false,
  current_conversations INTEGER NOT NULL DEFAULT 0,
  max_conversations INTEGER NOT NULL DEFAULT 5,
  last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_chat_agent_status_agent 
    FOREIGN KEY (agent_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_agent_status_company 
    FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE
);

-- Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_id 
  ON public.chat_conversations(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_status 
  ON public.chat_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_started_at 
  ON public.chat_conversations(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id 
  ON public.chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at 
  ON public.chat_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_agent_status_company_id 
  ON public.chat_agent_status(company_id);
CREATE INDEX IF NOT EXISTS idx_chat_agent_status_online 
  ON public.chat_agent_status(is_online, is_available);

-- Activer RLS sur toutes les tables
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_agent_status ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour chat_conversations
CREATE POLICY "chat_conversations_company_access" 
ON public.chat_conversations 
FOR ALL 
USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

CREATE POLICY "chat_conversations_public_read" 
ON public.chat_conversations 
FOR SELECT 
USING (
  -- Permettre l'accès public aux conversations via visitor_id
  auth.role() = 'anon' OR 
  company_id = get_user_company_id() OR 
  is_admin_optimized()
);

-- Politiques RLS pour chat_messages
CREATE POLICY "chat_messages_access" 
ON public.chat_messages 
FOR ALL 
USING (
  conversation_id IN (
    SELECT id FROM public.chat_conversations 
    WHERE company_id = get_user_company_id() OR is_admin_optimized()
  )
);

CREATE POLICY "chat_messages_public_read" 
ON public.chat_messages 
FOR SELECT 
USING (
  -- Permettre l'accès public aux messages via conversation
  auth.role() = 'anon' OR 
  conversation_id IN (
    SELECT id FROM public.chat_conversations 
    WHERE company_id = get_user_company_id() OR is_admin_optimized()
  )
);

-- Politiques RLS pour chat_agent_status
CREATE POLICY "chat_agent_status_company_access" 
ON public.chat_agent_status 
FOR ALL 
USING (
  company_id = get_user_company_id() OR is_admin_optimized()
);

-- Créer des triggers pour updated_at
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

CREATE TRIGGER update_chat_agent_status_updated_at
  BEFORE UPDATE ON public.chat_agent_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_chat_updated_at();

-- Activer la réplication temps réel pour les tables de chat
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_agent_status REPLICA IDENTITY FULL;