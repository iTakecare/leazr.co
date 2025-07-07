-- Enable realtime for chat tables
ALTER TABLE public.chat_conversations REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create indexes for better realtime performance (if not already exists)
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id_created_at ON public.chat_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_company_status ON public.chat_conversations(company_id, status);
CREATE INDEX IF NOT EXISTS idx_chat_agent_status_online ON public.chat_agent_status(company_id, is_online, is_available);