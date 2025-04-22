import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Nettoie et corrige les associations utilisateur-client
 * @param {string} clientId - ID du client à vérifier
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const syncClientUserAccount = async (clientId) => {
  try {
    console.log("Début de la synchronisation du compte client:", clientId);
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error("Erreur lors de la récupération du client:", clientError);
      return { success: false, message: "Client introuvable" };
    }

    if (!client.email) {
      return { success: false, message: "Le client n'a pas d'adresse email" };
    }

    // Vérifier si un utilisateur existe avec cet email
    const { data: userExists } = await supabase.rpc(
      'check_user_exists_by_email',
      { user_email: client.email }
    );

    if (!userExists) {
      // Réinitialiser les champs liés au compte utilisateur si aucun utilisateur n'existe
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          user_id: null,
          has_user_account: false,
          user_account_created_at: null
        })
        .eq('id', clientId);

      if (updateError) {
        console.error("Erreur lors de la réinitialisation:", updateError);
        return { success: false, message: "Erreur lors de la réinitialisation" };
      }

      return { success: true, message: "Association réinitialisée - aucun utilisateur trouvé" };
    }

    // Récupérer l'ID de l'utilisateur
    const { data: userId } = await supabase.rpc(
      'get_user_id_by_email',
      { user_email: client.email }
    );

    if (!userId) {
      return { success: false, message: "Impossible de récupérer l'ID utilisateur" };
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
      console.error("Erreur lors de la mise à jour:", updateError);
      return { success: false, message: "Erreur lors de la mise à jour" };
    }

    return { success: true, message: "Association mise à jour avec succès" };
  } catch (error) {
    console.error("Erreur lors de la synchronisation:", error);
    return { success: false, message: "Erreur inattendue lors de la synchronisation" };
  }
};

/**
 * Vérifie et nettoie les clients en double
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

/**
 * Obtient l'historique des associations client-utilisateur
 */
export const getUserClientAssociations = async () => {
  try {
    const { data, error } = await supabase.rpc('get_user_client_associations');
    
    if (error) {
      console.error("Erreur lors de la récupération des associations:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Erreur:", error);
    return null;
  }
};
