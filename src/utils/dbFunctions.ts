
import { supabase } from "@/integrations/supabase/client";

export const installDatabaseFunctions = async () => {
  try {
    console.log("Checking if database functions are installed...");
    
    // Check if update_client_securely function exists
    const { data: functionExists, error: checkError } = await supabase.rpc(
      'check_function_exists',
      { function_name: 'update_client_securely' }
    );
    
    if (checkError) {
      console.error("Error checking function existence:", checkError);
      return false;
    }
    
    // If function doesn't exist, create it
    if (!functionExists) {
      console.log("Installing update_client_securely function...");
      
      const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.update_client_securely(p_client_id uuid, p_updates jsonb)
      RETURNS boolean
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        UPDATE public.clients
        SET 
          name = COALESCE(p_updates->>'name', name),
          email = COALESCE(p_updates->>'email', email),
          company = COALESCE(p_updates->>'company', company),
          phone = COALESCE(p_updates->>'phone', phone),
          address = COALESCE(p_updates->>'address', address),
          city = COALESCE(p_updates->>'city', city),
          postal_code = COALESCE(p_updates->>'postal_code', postal_code),
          country = COALESCE(p_updates->>'country', country),
          vat_number = COALESCE(p_updates->>'vat_number', vat_number),
          notes = COALESCE(p_updates->>'notes', notes),
          status = COALESCE(p_updates->>'status', status),
          updated_at = NOW()
        WHERE id = p_client_id;
        
        RETURN FOUND;
      END;
      $$;
      `;
      
      const { error: creationError } = await supabase.rpc(
        'execute_sql',
        { sql: createFunctionSQL }
      );
      
      if (creationError) {
        console.error("Error creating update_client_securely function:", creationError);
        return false;
      }
      
      console.log("Database functions installed successfully");
    } else {
      console.log("Database functions already installed");
    }
    
    return true;
  } catch (error) {
    console.error("Error installing database functions:", error);
    return false;
  }
};
