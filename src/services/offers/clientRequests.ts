
import { getAdminSupabaseClient } from "@/integrations/supabase/client";

/**
 * Crée une nouvelle demande client (offre)
 */
export const createClientRequest = async (data: any) => {
  try {
    console.log("Creating client request with data:", data);
    
    // Utiliser le client admin pour contourner les restrictions RLS
    const adminClient = getAdminSupabaseClient();
    
    const { data: result, error } = await adminClient
      .from('offers')
      .insert(data)
      .select()
      .single();
    
    if (error) {
      console.error("Error inserting offer:", error);
      return { data: null, error };
    }
    
    return { data: result, error: null };
  } catch (error) {
    console.error("Exception in createClientRequest:", error);
    return { 
      data: null, 
      error: error instanceof Error 
        ? { message: error.message } 
        : { message: 'Une erreur inconnue est survenue' } 
    };
  }
};
