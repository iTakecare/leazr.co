-- Create function to get default country for company
CREATE OR REPLACE FUNCTION get_default_country_for_company()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_company_id uuid;
    default_country text;
BEGIN
    -- Get the user's company ID
    user_company_id := get_user_company_id();
    
    -- If no company ID found, return default
    IF user_company_id IS NULL THEN
        RETURN 'BE';
    END IF;
    
    -- Try to get country from company settings (if such field exists)
    -- For now, return 'BE' as default for Belgium
    -- This can be extended later to store country preferences per company
    RETURN 'BE';
END;
$$;