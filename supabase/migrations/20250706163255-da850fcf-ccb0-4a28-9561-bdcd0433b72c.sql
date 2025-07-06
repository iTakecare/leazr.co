-- Politique pour permettre aux conversations d'être créées et consultées par les visiteurs anonymes
CREATE POLICY "chat_conversations_visitor_access"
ON public.chat_conversations
FOR ALL
USING (true)
WITH CHECK (true);