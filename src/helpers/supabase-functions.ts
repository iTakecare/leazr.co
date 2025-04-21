
import { supabase } from "@/integrations/supabase/client";

/**
 * Installe les fonctions de base de données nécessaires dans Supabase
 * Cette fonction doit être appelée par un utilisateur avec les droits d'admin
 */
export const installDatabaseFunctions = async (): Promise<boolean> => {
  try {
    // Vérifier si la fonction update_client_user_account existe déjà
    const { data: functionExists, error: checkError } = await supabase.rpc(
      'check_function_exists',
      { function_name: 'update_client_user_account' }
    );
    
    if (checkError || !functionExists) {
      console.log("Création de la fonction update_client_user_account...");
      
      // Créer la fonction update_client_user_account
      const { error: createUpdateFunctionError } = await supabase.rpc(
        'execute_sql',
        { 
          sql: `
          CREATE OR REPLACE FUNCTION public.update_client_user_account(client_id uuid, user_id uuid)
          RETURNS boolean
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            UPDATE public.clients
            SET 
              user_id = $2,
              has_user_account = TRUE,
              user_account_created_at = NOW(),
              status = 'active'
            WHERE id = $1;
            
            RETURN FOUND;
          END;
          $$;
          `
        }
      );
      
      if (createUpdateFunctionError) {
        console.error("Erreur lors de la création de la fonction update_client_user_account:", createUpdateFunctionError);
      }
    }
    
    // Vérifier si la fonction mark_clients_as_duplicates existe déjà
    const { data: markFunctionExists, error: markCheckError } = await supabase.rpc(
      'check_function_exists',
      { function_name: 'mark_clients_as_duplicates' }
    );
    
    if (markCheckError || !markFunctionExists) {
      console.log("Création de la fonction mark_clients_as_duplicates...");
      
      // Créer la fonction mark_clients_as_duplicates
      const { error: createMarkFunctionError } = await supabase.rpc(
        'execute_sql',
        { 
          sql: `
          CREATE OR REPLACE FUNCTION public.mark_clients_as_duplicates(client_ids uuid[], main_client_id uuid)
          RETURNS boolean
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            UPDATE public.clients
            SET 
              status = 'duplicate',
              notes = COALESCE(notes, '') || E'\\n' || 'Marqué comme doublon le ' || NOW()::text || '. ID du client principal: ' || main_client_id::text
            WHERE id = ANY($1);
            
            RETURN FOUND;
          END;
          $$;
          `
        }
      );
      
      if (createMarkFunctionError) {
        console.error("Erreur lors de la création de la fonction mark_clients_as_duplicates:", createMarkFunctionError);
      }
    }
    
    // Vérifier si la fonction check_function_exists existe déjà
    const { data: checkFunctionExists, error: functionalCheckError } = await supabase.rpc(
      'check_function_exists',
      { function_name: 'check_function_exists' }
    );
    
    if (functionalCheckError && !checkFunctionExists) {
      console.log("Création de la fonction check_function_exists...");
      
      // Créer la fonction check_function_exists si elle n'existe pas
      const { error: createCheckFunctionError } = await supabase.rpc(
        'execute_sql',
        { 
          sql: `
          CREATE OR REPLACE FUNCTION public.check_function_exists(function_name text)
          RETURNS boolean
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            RETURN EXISTS (
              SELECT 1 FROM pg_proc p
              JOIN pg_namespace n ON p.pronamespace = n.oid
              WHERE n.nspname = 'public' AND p.proname = function_name
            );
          END;
          $$;
          `
        }
      );
      
      if (createCheckFunctionError) {
        console.error("Erreur lors de la création de la fonction check_function_exists:", createCheckFunctionError);
      }
    }
    
    return true;
  } catch (error) {
    console.error("Erreur dans installDatabaseFunctions:", error);
    return false;
  }
};
