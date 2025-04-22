
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Récupère l'ID client associé à un utilisateur
 * @param userId - L'ID de l'utilisateur
 * @returns L'ID du client ou null si aucun client n'est associé
 */
export const getClientIdForUser = async (userId: string): Promise<string | null> => {
  try {
    if (!userId) {
      console.error("getClientIdForUser: userId est requis");
      return null;
    }

    console.log(`Récupération de l'ID client pour l'utilisateur ${userId}`);

    // Vérifier d'abord dans le profil utilisateur (la nouvelle approche)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error("Erreur lors de la récupération du profil:", profileError);
    } 
    
    // Si nous avons trouvé un client_id dans le profil et qu'il n'est pas null
    if (profileData?.client_id) {
      console.log(`ID client trouvé dans le profil: ${profileData.client_id}`);
      return profileData.client_id;
    }

    // Sinon, essayer l'ancienne méthode via la table clients
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (clientError) {
      if (clientError.code === 'PGRST116') {
        console.log(`Aucun client trouvé pour l'utilisateur ${userId}`);
      } else {
        console.error("Erreur lors de la récupération du client:", clientError);
      }
      return null;
    }

    console.log(`ID client trouvé via la table clients: ${clientData.id}`);
    
    // Mise à jour du profil avec le client_id pour les futures requêtes
    if (clientData?.id) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ client_id: clientData.id })
        .eq('id', userId);
        
      if (updateError) {
        console.error("Erreur lors de la mise à jour du profil avec client_id:", updateError);
      } else {
        console.log(`Profil mis à jour avec client_id: ${clientData.id}`);
      }
    }

    return clientData?.id || null;
  } catch (error) {
    console.error("Erreur dans getClientIdForUser:", error);
    return null;
  }
};

/**
 * Lie un utilisateur à un client
 * @param clientId - L'ID du client
 * @param userId - L'ID de l'utilisateur
 * @returns true si la liaison a réussi, false sinon
 */
export const linkUserToClient = async (clientId: string, userId: string): Promise<boolean> => {
  try {
    if (!clientId || !userId) {
      console.error("linkUserToClient: clientId et userId sont requis");
      toast.error("Impossible de lier l'utilisateur: données manquantes");
      return false;
    }

    console.log(`Liaison de l'utilisateur ${userId} au client ${clientId}`);

    // Mettre à jour le client avec l'ID utilisateur
    const { error: clientUpdateError } = await supabase
      .from('clients')
      .update({
        user_id: userId,
        has_user_account: true,
        user_account_created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (clientUpdateError) {
      console.error("Erreur lors de la mise à jour du client:", clientUpdateError);
      toast.error("Erreur lors de la liaison utilisateur-client");
      return false;
    }

    // Mettre à jour le profil avec l'ID client
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({
        client_id: clientId
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error("Erreur lors de la mise à jour du profil:", profileUpdateError);
      // Ne pas retourner false ici car la principale liaison a réussi
    }

    toast.success("Utilisateur lié au client avec succès");
    return true;
  } catch (error) {
    console.error("Erreur dans linkUserToClient:", error);
    toast.error("Erreur lors de la liaison utilisateur-client");
    return false;
  }
};

/**
 * Nettoie les clients en double qui ont le même email
 * @returns Un objet contenant le résultat de l'opération
 */
export const cleanupDuplicateClients = async (): Promise<{
  success: boolean;
  mergedCount: number;
  error?: string;
}> => {
  try {
    const { data: duplicateEmails, error: findError } = await supabase.rpc('find_duplicate_client_emails');
    
    if (findError) {
      console.error("Erreur lors de la recherche des emails en double:", findError);
      return { success: false, mergedCount: 0, error: findError.message };
    }

    if (!duplicateEmails || duplicateEmails.length === 0) {
      return { success: true, mergedCount: 0 };
    }

    console.log(`${duplicateEmails.length} emails en double trouvés:`, duplicateEmails);
    let mergedCount = 0;

    for (const email of duplicateEmails) {
      const { data: clients } = await supabase
        .from('clients')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: true });

      if (clients && clients.length > 1) {
        const primaryClient = clients[0];
        const duplicateIds = clients.slice(1).map(c => c.id);

        // Marquer les clients en double
        await supabase.rpc('mark_clients_as_duplicates', {
          client_ids: duplicateIds,
          main_client_id: primaryClient.id
        });

        mergedCount += duplicateIds.length;
        console.log(`Clients en double traités pour ${email}`);
      }
    }

    return { success: true, mergedCount };
  } catch (error) {
    console.error("Erreur lors du nettoyage des clients en double:", error);
    return { 
      success: false, 
      mergedCount: 0, 
      error: error instanceof Error ? error.message : "Erreur inconnue" 
    };
  }
};

/**
 * Corrige l'association incorrecte entre un utilisateur et un client
 * @param clientId - L'ID du client à vérifier
 * @returns Un objet indiquant le succès ou l'échec de l'opération avec un message
 */
export const fixIncorrectUserAssociation = async (clientId: string): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    console.log("Tentative de correction de l'association pour le client:", clientId);
    
    // Récupérer les données du client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    
    if (clientError) {
      console.error("Erreur lors de la récupération du client:", clientError);
      return { success: false, message: "Client introuvable" };
    }
    
    // Si le client n'a pas d'email, impossible de corriger
    if (!client.email) {
      return { success: false, message: "Le client n'a pas d'adresse email" };
    }
    
    // Vérifier si un utilisateur existe avec cet email
    const { data: userExists } = await supabase.rpc(
      'check_user_exists_by_email',
      { user_email: client.email }
    );
    
    if (!userExists) {
      // Aucun utilisateur avec cet email
      // Réinitialiser les champs d'association utilisateur
      const { error: resetError } = await supabase
        .from('clients')
        .update({
          user_id: null,
          has_user_account: false,
          user_account_created_at: null
        })
        .eq('id', clientId);
      
      if (resetError) {
        return { success: false, message: "Erreur lors de la réinitialisation: " + resetError.message };
      }
      
      return { success: true, message: "Association réinitialisée - aucun utilisateur trouvé" };
    }
    
    // Récupérer l'ID utilisateur
    const { data: userId } = await supabase.rpc(
      'get_user_id_by_email',
      { user_email: client.email }
    );
    
    if (!userId) {
      return { success: false, message: "Impossible de récupérer l'ID utilisateur" };
    }
    
    // Vérifier si un autre client est déjà associé à cet utilisateur
    const { data: existingClients } = await supabase
      .from('clients')
      .select('id, name')
      .eq('user_id', userId)
      .neq('id', clientId);
    
    if (existingClients && existingClients.length > 0) {
      // Marquer les clients en double
      await supabase.rpc('mark_clients_as_duplicates', {
        client_ids: [clientId],
        main_client_id: existingClients[0].id
      });
      
      return { 
        success: true, 
        message: `Client marqué comme doublon. Client principal: ${existingClients[0].name}`
      };
    }
    
    // Mettre à jour le client avec le bon user_id
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        user_id: userId,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', clientId);
    
    if (updateError) {
      return { success: false, message: "Erreur lors de la mise à jour: " + updateError.message };
    }
    
    // Mettre à jour le profil utilisateur avec l'ID client
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ client_id: clientId })
      .eq('id', userId);
    
    if (profileUpdateError) {
      console.error("Erreur lors de la mise à jour du profil:", profileUpdateError);
      // Ne pas échouer entièrement, car la mise à jour du client a réussi
    }
    
    return { success: true, message: "Association corrigée avec succès" };
  } catch (error) {
    console.error("Erreur lors de la correction:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Erreur inconnue" 
    };
  }
};
