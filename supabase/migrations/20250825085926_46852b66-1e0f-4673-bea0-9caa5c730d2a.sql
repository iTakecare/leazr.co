-- Fix remaining function search_path issues by updating all security definer functions
-- This will ensure all functions have proper search_path set

-- Get all security definer functions and update them
DO $$
DECLARE
    func_record RECORD;
    func_definition TEXT;
BEGIN
    FOR func_record IN 
        SELECT 
            p.proname,
            p.oid,
            pg_get_function_arguments(p.oid) as args,
            pg_get_functiondef(p.oid) as definition
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
          AND p.prosecdef = true
          AND (p.proconfig IS NULL OR NOT ('search_path' = ANY(SELECT split_part(unnest(p.proconfig), '=', 1))))
    LOOP
        -- Update the function to add SET search_path TO 'public'
        BEGIN
            EXECUTE format('ALTER FUNCTION public.%I(%s) SET search_path TO ''public''', 
                          func_record.proname, 
                          func_record.args);
            RAISE NOTICE 'Updated function: %', func_record.proname;
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'Failed to update function %: %', func_record.proname, SQLERRM;
        END;
    END LOOP;
END $$;