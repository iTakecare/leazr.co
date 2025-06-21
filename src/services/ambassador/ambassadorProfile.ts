
import { supabase } from "@/integrations/supabase/client";

// Obtenir le profil ambassadeur de l'utilisateur actuel
export const getCurrentAmbassadorProfile = async (): Promise<string | null> => {
  try {
    console.log("🔍 DIAGNOSTIC - Début getCurrentAmbassadorProfile");
    
    // Vérifier l'utilisateur authentifié
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log("🔍 DIAGNOSTIC - Utilisateur:", {
      userId: user?.id,
      email: user?.email,
      userError: userError?.message
    });
    
    if (!user) {
      console.error("🔍 DIAGNOSTIC - Aucun utilisateur authentifié");
      return null;
    }
    
    // Utiliser directement la requête avec RLS - les politiques se chargeront de filtrer par auth.uid()
    const { data: ambassadorData, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('id, user_id, company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    console.log("🔍 DIAGNOSTIC - Résultat requête ambassadeur:", {
      ambassadorData,
      ambassadorError: ambassadorError?.message
    });
    
    if (ambassadorError) {
      console.error("🔍 DIAGNOSTIC - Erreur lors de la récupération du profil ambassadeur:", ambassadorError);
      return null;
    }
    
    if (!ambassadorData) {
      console.error("🔍 DIAGNOSTIC - Aucun profil ambassadeur trouvé pour l'utilisateur:", user.id);
      return null;
    }
    
    console.log("🔍 DIAGNOSTIC - Profil ambassadeur trouvé:", ambassadorData.id);
    return ambassadorData.id;
  } catch (error) {
    console.error("🔍 DIAGNOSTIC - Erreur fatale dans getCurrentAmbassadorProfile:", {
      errorMessage: error instanceof Error ? error.message : 'Erreur inconnue',
      errorStack: error instanceof Error ? error.stack : undefined,
      errorType: typeof error,
      errorObject: error
    });
    return null;
  }
};
