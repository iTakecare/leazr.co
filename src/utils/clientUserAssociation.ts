
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
 */
export const cleanupDuplicateClients = async () => {
  try {
    const { data: duplicateEmails, error: findError } = await supabase.rpc('find_duplicate_client_emails');
    
    if (findError) {
      console.error("Erreur lors de la recherche des emails en double:", findError);
      toast.error("Erreur lors de la recherche des emails en double");
      return;
    }

    if (!duplicateEmails || duplicateEmails.length === 0) {
      toast.info("Aucun email en double trouvé");
      return;
    }

    console.log(`${duplicateEmails.length} emails en double trouvés:`, duplicateEmails);

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

        console.log(`Clients en double traités pour ${email}`);
      }
    }

    toast.success("Nettoyage des clients en double terminé");
  } catch (error) {
    console.error("Erreur lors du nettoyage des clients en double:", error);
    toast.error("Erreur lors du nettoyage des clients en double");
  }
};
