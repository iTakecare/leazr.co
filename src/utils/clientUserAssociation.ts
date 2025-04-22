
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
 * Nettoie les clients en double et les fusionne
 * @returns Résultat de l'opération
 */
export const cleanupDuplicateClients = async (): Promise<{ success: boolean; mergedCount: number; error?: string }> => {
  try {
    console.log("Démarrage du nettoyage des doublons...");
    
    // Utiliser le client admin pour éviter les problèmes de RLS
    const adminSupabase = getAdminSupabaseClient();
    
    if (!adminSupabase) {
      return { success: false, mergedCount: 0, error: "Client admin Supabase non disponible" };
    }
    
    // Récupérer tous les clients avec leur email
    const { data: clients, error: clientsError } = await adminSupabase
      .from('clients')
      .select('id, email, name, company, status, created_at')
      .order('created_at', { ascending: true }); // Les plus anciens d'abord
    
    if (clientsError) {
      console.error("Erreur lors de la récupération des clients:", clientsError);
      return { success: false, mergedCount: 0, error: clientsError.message };
    }
    
    const emailGroups: { [email: string]: typeof clients } = {};
    let mergedCount = 0;
    
    // Regrouper les clients par email
    clients?.forEach(client => {
      if (client.email) {
        const email = client.email.toLowerCase().trim();
        if (!emailGroups[email]) {
          emailGroups[email] = [];
        }
        emailGroups[email].push(client);
      }
    });
    
    // Traiter chaque groupe d'emails
    for (const [email, clientsGroup] of Object.entries(emailGroups)) {
      if (clientsGroup.length > 1) {
        console.log(`Email ${email} a ${clientsGroup.length} clients associés`);
        
        // Trier par date de création (ascendant) et statut (active > inactive > lead)
        const sortedClients = [...clientsGroup].sort((a, b) => {
          // Priorité au statut active
          if (a.status === 'active' && b.status !== 'active') return -1;
          if (a.status !== 'active' && b.status === 'active') return 1;
          
          // Ensuite, priorité au statut inactive par rapport à lead
          if (a.status === 'inactive' && b.status === 'lead') return -1;
          if (a.status === 'lead' && b.status === 'inactive') return 1;
          
          // Si même statut, trier par date de création (le plus ancien d'abord)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        // Le premier client du groupe trié est le principal
        const mainClient = sortedClients[0];
        const duplicateClients = sortedClients.slice(1);
        
        if (duplicateClients.length > 0) {
          console.log(`Client principal: ${mainClient.name} (${mainClient.id})`);
          console.log(`Clients en double: ${duplicateClients.map(c => c.id).join(', ')}`);
          
          try {
            // Marquer les clients en double comme "duplicate"
            const { error: markError } = await adminSupabase.rpc(
              'mark_clients_as_duplicates',
              { 
                client_ids: duplicateClients.map(c => c.id),
                main_client_id: mainClient.id
              }
            );
            
            if (markError) {
              console.error("Erreur lors du marquage des doublons:", markError);
              continue;
            }
            
            mergedCount += duplicateClients.length;
          } catch (err) {
            console.error("Erreur lors du marquage des clients en double:", err);
          }
        }
      }
    }
    
    console.log(`Nettoyage terminé. ${mergedCount} clients fusionnés.`);
    return { success: true, mergedCount };
  } catch (error: any) {
    console.error("Erreur lors du nettoyage des doublons:", error);
    return { success: false, mergedCount: 0, error: error.message };
  }
};
