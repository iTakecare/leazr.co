-- Fix critical chat system security vulnerability
-- Remove anonymous access and implement proper authentication

-- 1. Remove overly permissive public read policies for chat_conversations
DROP POLICY IF EXISTS "chat_conversations_public_read" ON public.chat_conversations;
DROP POLICY IF EXISTS "chat_conversations_visitor_access" ON public.chat_conversations;

-- Create secure policies for chat_conversations
-- Allow company members to access their company's conversations
CREATE POLICY "chat_conversations_company_access_secure" 
ON public.chat_conversations 
FOR ALL 
USING ((company_id = get_user_company_id()) OR is_admin_optimized())
WITH CHECK ((company_id = get_user_company_id()) OR is_admin_optimized());

-- Allow visitors to only access conversations they initiated (using visitor_id)
CREATE POLICY "chat_conversations_visitor_own_only" 
ON public.chat_conversations 
FOR SELECT 
USING (
  auth.role() = 'anon' AND 
  visitor_id IS NOT NULL AND 
  visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
);

-- Allow anonymous visitors to create new conversations with visitor_id
CREATE POLICY "chat_conversations_visitor_create" 
ON public.chat_conversations 
FOR INSERT 
WITH CHECK (
  auth.role() = 'anon' AND 
  visitor_id IS NOT NULL AND 
  visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
);

-- 2. Remove overly permissive public read policies for chat_messages  
DROP POLICY IF EXISTS "chat_messages_public_read" ON public.chat_messages;

-- Create secure policies for chat_messages
-- Allow company members to access messages from their company's conversations
CREATE POLICY "chat_messages_company_access_secure" 
ON public.chat_messages 
FOR ALL 
USING (
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE (company_id = get_user_company_id()) OR is_admin_optimized()
  )
)
WITH CHECK (
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE (company_id = get_user_company_id()) OR is_admin_optimized()
  )
);

-- Allow visitors to only access messages from conversations they own
CREATE POLICY "chat_messages_visitor_own_only" 
ON public.chat_messages 
FOR SELECT 
USING (
  auth.role() = 'anon' AND 
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE visitor_id IS NOT NULL AND 
    visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
  )
);

-- Allow visitors to create messages in their own conversations
CREATE POLICY "chat_messages_visitor_create" 
ON public.chat_messages 
FOR INSERT 
WITH CHECK (
  auth.role() = 'anon' AND 
  conversation_id IN (
    SELECT id FROM chat_conversations 
    WHERE visitor_id IS NOT NULL AND 
    visitor_id = current_setting('request.headers', true)::json->>'x-visitor-id'
  )
);

-- 3. Create a secure function to validate visitor access
CREATE OR REPLACE FUNCTION public.get_visitor_conversations(p_visitor_id text)
RETURNS TABLE(
  id uuid,
  status text,
  visitor_name text,
  visitor_email text,
  created_at timestamp with time zone,
  company_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only return conversations for the specific visitor
  RETURN QUERY
  SELECT 
    cc.id,
    cc.status,
    cc.visitor_name,
    cc.visitor_email,
    cc.created_at,
    cc.company_id
  FROM chat_conversations cc
  WHERE cc.visitor_id = p_visitor_id
  ORDER BY cc.created_at DESC;
END;
$function$;

-- 4. Create a function to get messages for a visitor's conversation
CREATE OR REPLACE FUNCTION public.get_visitor_messages(p_conversation_id uuid, p_visitor_id text)
RETURNS TABLE(
  id uuid,
  message text,
  sender_type text,
  sender_name text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Verify the conversation belongs to the visitor before returning messages
  IF NOT EXISTS (
    SELECT 1 FROM chat_conversations 
    WHERE id = p_conversation_id AND visitor_id = p_visitor_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    cm.id,
    cm.message,
    cm.sender_type,
    cm.sender_name,
    cm.created_at
  FROM chat_messages cm
  WHERE cm.conversation_id = p_conversation_id
  ORDER BY cm.created_at ASC;
END;
$function$;