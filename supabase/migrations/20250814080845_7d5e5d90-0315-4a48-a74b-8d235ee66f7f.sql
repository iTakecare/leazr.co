-- Complete removal of partner functionality from database

-- Drop partner-related tables in correct order (respecting foreign keys)
DROP TABLE IF EXISTS public.partner_clients CASCADE;
DROP TABLE IF EXISTS public.partners CASCADE;

-- Drop partner-related functions
DROP FUNCTION IF EXISTS public.get_company_partners_secure() CASCADE;
DROP FUNCTION IF EXISTS public.create_primary_collaborator_for_client(uuid, text, text, text) CASCADE;

-- Remove partner-related columns from other tables
ALTER TABLE public.offers DROP COLUMN IF EXISTS partner_id CASCADE;
ALTER TABLE public.offers DROP COLUMN IF EXISTS partner_commission CASCADE;
ALTER TABLE public.contracts DROP COLUMN IF EXISTS partner_id CASCADE;

-- Clean up any partner-related policies that might reference deleted tables
-- (These will be automatically cleaned up when tables are dropped, but being explicit)

-- Remove any partner-related enum values if they exist
-- This will be handled automatically when we clean up the code

-- Add comment about the removal
COMMENT ON SCHEMA public IS 'Partner functionality completely removed - only ambassador functionality remains';