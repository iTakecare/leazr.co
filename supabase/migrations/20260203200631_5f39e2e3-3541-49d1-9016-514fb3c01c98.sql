-- =====================================================
-- SECURITY FIX: Restrict product_upsells public access
-- =====================================================

-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "product_upsells_select_public" ON public.product_upsells;

-- Create company-scoped access policy for product_upsells
-- Only authenticated users from the same company can view upsell data
CREATE POLICY "product_upsells_company_access" ON public.product_upsells
FOR SELECT TO authenticated
USING (
  product_id IN (
    SELECT id FROM public.products WHERE company_id = get_user_company_id()
  ) OR is_admin_optimized()
);

-- =====================================================
-- SECURITY FIX: Fix platform_settings overly permissive policy
-- =====================================================

-- Drop the overly permissive policy that allows any authenticated user to modify
DROP POLICY IF EXISTS "platform_settings_authenticated_full_access" ON public.platform_settings;

-- Keep only admin-level access for full control (the existing admin policy should handle this)
-- Verify admin policy exists, create if not
DO $$
BEGIN
  -- Check if admin policy exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'platform_settings' 
    AND policyname = 'platform_settings_admin_manage'
  ) THEN
    -- Create admin-only policy if it doesn't exist
    EXECUTE 'CREATE POLICY "platform_settings_admin_manage" ON public.platform_settings
    FOR ALL TO authenticated
    USING (is_admin_optimized())
    WITH CHECK (is_admin_optimized())';
  END IF;
END $$;

-- =====================================================
-- SECURITY FIX: Fix custom_auth_tokens edge insert policy
-- =====================================================

-- Drop the overly permissive anonymous insert policy
DROP POLICY IF EXISTS "custom_auth_tokens_edge_insert" ON public.custom_auth_tokens;

-- Create a more restrictive policy that validates company_id exists
CREATE POLICY "custom_auth_tokens_validated_insert" ON public.custom_auth_tokens
FOR INSERT TO anon
WITH CHECK (
  company_id IS NOT NULL AND
  company_id IN (SELECT id FROM public.companies WHERE is_active = true)
);

-- =====================================================
-- SECURITY FIX: Fix chat_conversations visitor access
-- Note: Chat must remain accessible to visitors but scoped to their session
-- =====================================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "chat_conversations_visitor_access" ON public.chat_conversations;

-- Create visitor-scoped policies for chat
-- Visitors can only see conversations where they are the visitor_id
CREATE POLICY "chat_conversations_visitor_select" ON public.chat_conversations
FOR SELECT TO anon
USING (
  visitor_id IS NOT NULL AND
  visitor_id = COALESCE(
    current_setting('request.headers', true)::json->>'x-visitor-id',
    ''
  )
);

-- Visitors can create conversations with their visitor_id
CREATE POLICY "chat_conversations_visitor_insert" ON public.chat_conversations
FOR INSERT TO anon
WITH CHECK (
  visitor_id IS NOT NULL AND
  company_id IN (SELECT id FROM public.companies WHERE is_active = true)
);

-- Visitors can update only their own conversations (e.g., add email, close)
CREATE POLICY "chat_conversations_visitor_update" ON public.chat_conversations
FOR UPDATE TO anon
USING (
  visitor_id IS NOT NULL AND
  visitor_id = COALESCE(
    current_setting('request.headers', true)::json->>'x-visitor-id',
    ''
  )
)
WITH CHECK (
  visitor_id IS NOT NULL AND
  visitor_id = COALESCE(
    current_setting('request.headers', true)::json->>'x-visitor-id',
    ''
  )
);

-- =====================================================
-- NOTE: clients table policies are intentionally NOT modified here
-- Per user's custom knowledge, some client data must be accessible
-- to unauthenticated users for contract signing workflows.
-- This requires a more careful review of the specific use cases.
-- =====================================================