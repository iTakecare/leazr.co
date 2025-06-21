
import { supabase } from "@/integrations/supabase/client";

// Obtenir le profil de l'ambassadeur actuel
export const getCurrentAmbassadorProfile = async (): Promise<string | null> => {
  try {
    console.log("Getting current ambassador profile...");
    
    const { data: ambassadorData, error } = await supabase
      .from('ambassadors')
      .select('id')
      .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
      .single();
    
    if (error) {
      console.error("Error getting ambassador profile:", error);
      return null;
    }
    
    console.log("Ambassador profile found:", ambassadorData?.id);
    return ambassadorData?.id || null;
  } catch (error) {
    console.error("Exception getting ambassador profile:", error);
    return null;
  }
};

// Vérifier si l'utilisateur actuel est un ambassadeur
export const isCurrentUserAmbassador = async (): Promise<boolean> => {
  try {
    const ambassadorId = await getCurrentAmbassadorProfile();
    return ambassadorId !== null;
  } catch (error) {
    console.error("Error checking if user is ambassador:", error);
    return false;
  }
};

// Obtenir les détails complets du profil ambassadeur
export const getAmbassadorProfileDetails = async () => {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error("No authenticated user");
    }

    const { data: ambassadorData, error } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('user_id', user.user.id)
      .single();
    
    if (error) {
      console.error("Error getting ambassador details:", error);
      throw error;
    }
    
    return ambassadorData;
  } catch (error) {
    console.error("Exception getting ambassador details:", error);
    throw error;
  }
};
