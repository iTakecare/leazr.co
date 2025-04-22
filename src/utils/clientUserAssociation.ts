
import { getSupabaseClient, getAdminSupabaseClient } from "@/integrations/supabase/client";

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

/**
 * Vérifie et corrige les associations user_id incorrectes
 * @param clientId ID du client à vérifier et corriger
 * @returns Résultat de l'opération
 */
export const fixIncorrectUserAssociation = async (clientId: string): Promise<{ success: boolean; message: string }> => {
  try {
    // Get admin supabase client for auth queries
    const adminClient = getAdminSupabaseClient();
    
    // Get the client details
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, email, user_id, has_user_account')
      .eq('id', clientId)
      .single();
      
    if (clientError || !client) {
      console.error("Erreur lors de la récupération du client:", clientError);
      return { success: false, message: "Client introuvable" };
    }
    
    // If client has no email, we can't verify or fix association
    if (!client.email) {
      return { success: false, message: "Le client n'a pas d'adresse email" };
    }
    
    // Try to get user ID from email using our secure function
    const { data: correctUserId, error: userIdError } = await supabase.rpc(
      'get_user_id_by_email',
      { user_email: client.email }
    );
    
    if (userIdError) {
      console.error("Erreur lors de la recherche utilisateur par email:", userIdError);
      return { success: false, message: "Erreur lors de la vérification de l'utilisateur" };
    }
    
    // No user found with this email
    if (!correctUserId) {
      // If client has user_id but no matching auth user with that email exists
      if (client.user_id && client.has_user_account) {
        // Reset the user association
        const { error: resetError } = await adminClient
          .from('clients')
          .update({ 
            user_id: null, 
            has_user_account: false,
            user_account_created_at: null
          })
          .eq('id', clientId);
          
        if (resetError) {
          console.error("Erreur lors de la réinitialisation de l'association:", resetError);
          return { success: false, message: "Erreur lors de la réinitialisation" };
        }
        
        return { success: true, message: "Association réinitialisée car aucun utilisateur trouvé" };
      }
      
      return { success: false, message: "Aucun utilisateur trouvé pour cette adresse email" };
    }
    
    // Check if the user ID is different from the stored one
    if (client.user_id !== correctUserId) {
      console.log(`Association incorrecte détectée. Actuel: ${client.user_id}, Correct: ${correctUserId}`);
      
      // Update the client with the correct user ID
      const { error: updateError } = await adminClient
        .from('clients')
        .update({ 
          user_id: correctUserId, 
          has_user_account: true,
          user_account_created_at: new Date().toISOString()
        })
        .eq('id', clientId);
        
      if (updateError) {
        console.error("Erreur lors de la mise à jour de l'association:", updateError);
        return { success: false, message: "Erreur lors de la correction de l'association" };
      }
      
      return { success: true, message: "Association utilisateur corrigée avec succès" };
    }
    
    // If user ID is correct but has_user_account is false
    if (client.user_id === correctUserId && !client.has_user_account) {
      // Update has_user_account flag
      const { error: updateError } = await adminClient
        .from('clients')
        .update({ 
          has_user_account: true,
          user_account_created_at: new Date().toISOString() 
        })
        .eq('id', clientId);
        
      if (updateError) {
        console.error("Erreur lors de la mise à jour du statut:", updateError);
        return { success: false, message: "Erreur lors de la mise à jour du statut" };
      }
      
      return { success: true, message: "Statut du compte utilisateur corrigé" };
    }
    
    return { success: true, message: "L'association utilisateur est correcte" };
  } catch (error) {
    console.error("Erreur dans fixIncorrectUserAssociation:", error);
    return { success: false, message: "Erreur lors de la vérification de l'association" };
  }
};
