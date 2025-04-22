
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
          has_user_account = COALESCE((p_updates->>'has_user_account')::boolean, has_user_account),
          user_id = COALESCE(p_updates->>'user_id'::uuid, user_id),
          user_account_created_at = COALESCE(p_updates->>'user_account_created_at', user_account_created_at),
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
      
      // Add the check_user_exists_by_id function if it doesn't exist
      const { data: userCheckFunctionExists, error: userCheckFunctionError } = await supabase.rpc(
        'check_function_exists',
        { function_name: 'check_user_exists_by_id' }
      );
      
      if (userCheckFunctionError) {
        console.error("Error checking user check function existence:", userCheckFunctionError);
      } else if (!userCheckFunctionExists) {
        console.log("Installing check_user_exists_by_id function...");
        
        const createUserCheckFunction = `
        CREATE OR REPLACE FUNCTION public.check_user_exists_by_id(user_id uuid)
        RETURNS boolean
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        BEGIN
          RETURN EXISTS (
            SELECT 1 FROM auth.users WHERE id = user_id
          );
        END;
        $$;
        `;
        
        const { error: userCheckCreationError } = await supabase.rpc(
          'execute_sql',
          { sql: createUserCheckFunction }
        );
        
        if (userCheckCreationError) {
          console.error("Error creating check_user_exists_by_id function:", userCheckCreationError);
        } else {
          console.log("check_user_exists_by_id function created successfully");
        }
      }
      
      // Create get_user_id_by_email function if it doesn't exist
      const { data: getUserIdByEmailExists, error: getUserIdByEmailError } = await supabase.rpc(
        'check_function_exists',
        { function_name: 'get_user_id_by_email' }
      );
      
      if (getUserIdByEmailError) {
        console.error("Error checking get_user_id_by_email function existence:", getUserIdByEmailError);
      } else if (!getUserIdByEmailExists) {
        console.log("Installing get_user_id_by_email function...");
        
        const createGetUserIdByEmailFunction = `
        CREATE OR REPLACE FUNCTION public.get_user_id_by_email(user_email text)
        RETURNS uuid
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          user_id UUID;
        BEGIN
          SELECT id INTO user_id FROM auth.users WHERE email = user_email LIMIT 1;
          RETURN user_id;
        END;
        $$;
        `;
        
        const { error: getUserIdByEmailCreationError } = await supabase.rpc(
          'execute_sql',
          { sql: createGetUserIdByEmailFunction }
        );
        
        if (getUserIdByEmailCreationError) {
          console.error("Error creating get_user_id_by_email function:", getUserIdByEmailCreationError);
        } else {
          console.log("get_user_id_by_email function created successfully");
        }
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
