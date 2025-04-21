
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

export const cleanupDuplicateClients = async () => {
  console.log("Début du nettoyage des clients dupliqués");
  try {
    // Rechercher les clients avec le même email
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, email, name, user_id, created_at')
      .not('email', 'is', null)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Erreur lors de la récupération des clients:", error);
      return { success: false, error: "Error fetching clients" };
    }
    
    // Grouper les clients par email
    const clientsByEmail: Record<string, any[]> = {};
    clients?.forEach(client => {
      if (client.email) {
        if (!clientsByEmail[client.email.toLowerCase()]) {
          clientsByEmail[client.email.toLowerCase()] = [];
        }
        clientsByEmail[client.email.toLowerCase()].push(client);
      }
    });
    
    let mergedCount = 0;
    let errors: string[] = [];
    
    // Traiter les groupes qui ont plus d'un client
    for (const email in clientsByEmail) {
      const clientsWithSameEmail = clientsByEmail[email];
      
      if (clientsWithSameEmail.length > 1) {
        console.log(`Trouvé ${clientsWithSameEmail.length} clients avec l'email ${email}`);
        
        // Prendre le premier client comme référence (le plus ancien)
        const primaryClient = clientsWithSameEmail[0];
        const duplicateClients = clientsWithSameEmail.slice(1);
        
        for (const duplicateClient of duplicateClients) {
          try {
            // Transférer les offres et contrats vers le client principal
            await supabase.rpc('merge_clients', {
              source_client_id: duplicateClient.id,
              target_client_id: primaryClient.id
            });
            
            // Supprimer le client dupliqué
            const { error: deleteError } = await supabase
              .from('clients')
              .delete()
              .eq('id', duplicateClient.id);
            
            if (deleteError) {
              console.error(`Erreur lors de la suppression du client ${duplicateClient.id}:`, deleteError);
              errors.push(`Failed to delete client ${duplicateClient.id}: ${deleteError.message}`);
            } else {
              console.log(`Client ${duplicateClient.id} fusionné avec ${primaryClient.id} et supprimé`);
              mergedCount++;
            }
          } catch (mergeError) {
            console.error(`Erreur lors de la fusion des clients:`, mergeError);
            errors.push(`Failed to merge client ${duplicateClient.id}: ${mergeError}`);
          }
        }
      }
    }
    
    return { 
      success: true, 
      mergedCount,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    console.error("Erreur lors du nettoyage des clients dupliqués:", error);
    return { success: false, error: "Error cleaning up duplicate clients" };
  }
};
