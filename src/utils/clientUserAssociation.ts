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

/**
 * Nettoie les clients en double en fusionnant ceux qui ont le même email
 * @returns Un objet avec le statut de l'opération et les détails
 */
export const cleanupDuplicateClients = async (): Promise<{ 
  success: boolean; 
  mergedCount: number;
  error?: string;
}> => {
  try {
    console.log("Démarrage du nettoyage des clients en double par email...");
    const adminClient = getAdminSupabaseClient();
    
    // Identifier les emails en double dans la table clients
    const { data: duplicateEmails, error: findError } = await supabase
      .rpc('find_duplicate_client_emails');
    
    if (findError) {
      console.error("Erreur lors de la recherche des emails en double:", findError);
      return { success: false, mergedCount: 0, error: "Erreur lors de la recherche des emails en double" };
    }
    
    if (!duplicateEmails || duplicateEmails.length === 0) {
      console.log("Aucun email en double trouvé");
      return { success: true, mergedCount: 0 };
    }
    
    console.log(`${duplicateEmails.length} emails en double trouvés`);
    
    let mergedCount = 0;
    
    // Pour chaque email en double, fusionner les clients
    for (const email of duplicateEmails) {
      if (!email) continue;
      
      // Récupérer tous les clients avec cet email
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .ilike('email', email)
        .order('created_at', { ascending: true });
      
      if (clientsError || !clients || clients.length <= 1) {
        console.error(`Erreur ou client unique pour ${email}:`, clientsError);
        continue;
      }
      
      // Le premier client (le plus ancien) sera conservé
      const primaryClient = clients[0];
      const duplicateClients = clients.slice(1);
      
      console.log(`Fusion de ${duplicateClients.length} clients en double pour l'email ${email}`);
      
      // Mettre à jour toutes les relations pour pointer vers le client principal
      for (const duplicate of duplicateClients) {
        try {
          // 1. Mettre à jour les collaborateurs pour les associer au client principal
          const { error: updateCollabError } = await adminClient
            .from('client_collaborators')
            .update({ client_id: primaryClient.id })
            .eq('client_id', duplicate.id);
          
          if (updateCollabError) {
            console.error(`Erreur lors de la mise à jour des collaborateurs pour ${duplicate.id}:`, updateCollabError);
          }
          
          // 2. Mettre à jour les offres pour les associer au client principal
          const { error: updateOffersError } = await adminClient
            .from('offers')
            .update({ client_id: primaryClient.id })
            .eq('client_id', duplicate.id);
          
          if (updateOffersError) {
            console.error(`Erreur lors de la mise à jour des offres pour ${duplicate.id}:`, updateOffersError);
          }
          
          // 3. Marquer le client dupliqué comme "duplicate" dans le statut
          const { error: markDuplicateError } = await adminClient
            .from('clients')
            .update({ 
              status: 'duplicate',
              notes: `${duplicate.notes ? duplicate.notes + '\n\n' : ''}[AUTO] Marqué comme doublon de ${primaryClient.id} le ${new Date().toISOString()}`
            })
            .eq('id', duplicate.id);
          
          if (markDuplicateError) {
            console.error(`Erreur lors du marquage du client ${duplicate.id} comme doublon:`, markDuplicateError);
          } else {
            mergedCount++;
          }
          
        } catch (err) {
          console.error(`Erreur lors de la fusion du client ${duplicate.id}:`, err);
        }
      }
    }
    
    return { 
      success: true, 
      mergedCount,
      error: mergedCount === 0 ? "Aucun client n'a pu être fusionné" : undefined
    };
    
  } catch (error) {
    console.error("Erreur lors du nettoyage des clients en double:", error);
    return { 
      success: false, 
      mergedCount: 0,
      error: "Erreur lors du nettoyage des clients en double"
    };
  }
};
