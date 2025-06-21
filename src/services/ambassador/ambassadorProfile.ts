
import { supabase } from "@/integrations/supabase/client";

// Obtenir le profil ambassadeur de l'utilisateur actuel
export const getCurrentAmbassadorProfile = async (): Promise<string | null> => {
  try {
    console.log("Getting current ambassador profile using RLS");
    
    // Utiliser directement la requête avec RLS - les politiques se chargeront de filtrer par auth.uid()
    const { data: ambassadorData, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('id')
      .maybeSingle();
    
    if (ambassadorError) {
      console.error("Error fetching ambassador data:", ambassadorError);
      return null;
    }
    
    if (!ambassadorData) {
      console.error("No ambassador profile found for current user");
      return null;
    }
    
    console.log("Ambassador found:", ambassadorData.id);
    return ambassadorData.id;
  } catch (error) {
    console.error("Error getting ambassador profile:", error);
    return null;
  }
};
