
import { getSupabaseClient } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();

export const getClientIdForUser = async (userId: string, userEmail: string | null): Promise<string | null> => {
  console.log("Vérification de l'association client pour l'utilisateur:", userId, userEmail);
  try {
    // Étape 1: Rechercher par liaison directe dans clients.user_id
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (clientError) {
      console.error("Erreur lors de la recherche de client par user_id:", clientError);
    }

    if (clientData?.id) {
      console.log("Client trouvé par user_id:", clientData.id);
      return clientData.id;
    }

    // Étape 2: Si aucun client n'est trouvé par user_id et que l'email est disponible
    if (userEmail) {
      console.log("Recherche de client par email:", userEmail);
      const { data: emailClientData, error: emailError } = await supabase
        .from('clients')
        .select('id')
        .ilike('email', userEmail)
        .maybeSingle();

      if (emailError) {
        console.error("Erreur lors de la recherche de client par email:", emailError);
      }

      if (emailClientData?.id) {
        console.log("Client trouvé par email:", emailClientData.id);
        
        // Mettre à jour le user_id du client
        const { error: updateError } = await supabase
          .from('clients')
          .update({ user_id: userId, has_user_account: true })
          .eq('id', emailClientData.id);
        
        if (updateError) {
          console.error("Erreur lors de la mise à jour du user_id du client:", updateError);
        } else {
          console.log("User ID mis à jour pour le client:", emailClientData.id);
        }
        
        return emailClientData.id;
      }
    }

    console.log("Aucun client trouvé pour cet utilisateur.");
    return null;
  } catch (error) {
    console.error("Erreur lors de la recherche de client associé:", error);
    return null;
  }
};

export const linkUserToClient = async (userId: string, userEmail: string | null) => {
  console.log("Tentative d'association du compte", userEmail, "("+userId+") à un client");
  try {
    const clientId = await getClientIdForUser(userId, userEmail);
    if (clientId) {
      return { success: true, clientId };
    }
    
    // Aucun client trouvé, on vérifie si l'auto-création est activée
    // Actuellement, laissons ce comportement comme il est mais ajoutons plus de logs
    console.log("Aucun client trouvé pour cet email, la création automatique est désactivée");
    return { success: false, error: "No client found" };
  } catch (error) {
    console.error("Erreur lors de l'association utilisateur-client:", error);
    return { success: false, error: "Error during user-client association" };
  }
};
