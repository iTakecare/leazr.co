import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cleanupDuplicateClients } from "./clientUserAssociation";

/**
 * Nettoie et corrige les associations utilisateur-client
 * @param {string} clientId - ID du client à vérifier
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const syncClientUserAccount = async (clientId: string) => {
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
    const { error: updateClientError } = await supabase
      .from('clients')
      .update({
        user_id: userId,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (updateClientError) {
      console.error("Erreur lors de la mise à jour du client:", updateClientError);
      return { success: false, message: "Erreur lors de la mise à jour du client" };
    }

    // Mettre à jour également le profil utilisateur avec le client_id
    const { error: updateProfileError } = await supabase
      .from('profiles')
      .update({
        client_id: clientId
      })
      .eq('id', userId);

    if (updateProfileError) {
      console.error("Erreur lors de la mise à jour du profil:", updateProfileError);
      // Ne pas échouer si la mise à jour du profil échoue
    }

    return { success: true, message: "Association mise à jour avec succès" };
  } catch (error) {
    console.error("Erreur lors de la synchronisation:", error);
    return { success: false, message: "Erreur inattendue lors de la synchronisation" };
  }
};

/**
 * Utility function to delete a specific user account
 * Used for admin purposes to clean up problematic accounts
 */
export const deleteSpecificUserAccount = async (userId: string): Promise<void> => {
  try {
    if (!userId) {
      toast.error("L'identifiant utilisateur est requis");
      return;
    }
    
    console.log(`Début de la suppression de l'utilisateur: ${userId}`);
    
    // Use admin client for operations requiring admin privileges
    const supabaseAdmin = getAdminSupabaseClient();
    
    // First update related entities to remove user_id references
    const tables = ['clients', 'partners', 'ambassadors'];
    
    for (const table of tables) {
      try {
        const { error: updateError } = await supabaseAdmin
          .from(table)
          .update({
            user_id: null,
            has_user_account: false,
            user_account_created_at: null
          })
          .eq('user_id', userId);
        
        if (updateError) {
          console.error(`Erreur lors de la mise à jour de ${table}:`, updateError);
          // Continue with deletion process even if this fails
        } else {
          console.log(`Association utilisateur supprimée dans ${table}`);
        }
      } catch (err) {
        console.error(`Erreur inattendue lors de la mise à jour de ${table}:`, err);
      }
    }
    
    // Delete the user's profile
    try {
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .delete()
        .eq('id', userId);
        
      if (profileError) {
        console.log(`Erreur lors de la suppression du profil: ${profileError.message}`);
      } else {
        console.log(`Profil utilisateur supprimé`);
      }
    } catch (err) {
      console.error(`Exception lors de la suppression du profil: ${err}`);
    }
    
    // Delete the user with admin supabase client
    try {
      console.log("Tentative de suppression avec admin.deleteUser");
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (error) {
        console.error(`Erreur lors de la suppression de l'utilisateur avec admin.deleteUser: ${error.message}`);
        
        // Fallback to edge function if admin client fails
        console.log("Fallback vers l'edge function delete-user");
        const { data, error: edgeFunctionError } = await supabase.functions.invoke('delete-user', {
          body: { user_id: userId }
        });
        
        if (edgeFunctionError) {
          console.error(`Erreur lors de l'appel à l'edge function: ${edgeFunctionError.message}`);
          throw new Error(`Échec de suppression de l'utilisateur: ${edgeFunctionError.message}`);
        }
        
        console.log("Utilisateur supprimé avec succès via edge function");
      } else {
        console.log(`Utilisateur ${userId} supprimé avec succès via admin.deleteUser`);
      }
    } catch (error) {
      console.error("Échec complet de la suppression:", error);
      throw error;
    }
    
  } catch (error) {
    console.error("Erreur dans deleteSpecificUserAccount:", error);
    throw error; // Rethrow the error to be caught by the caller
  }
};

// List of users to delete
const usersToDelete = [
  'd552a5c0-ffd3-4523-a237-d7bb8f46ec56',
  '4d5aa31f-4a2c-46ed-b97a-d7fcddd2ebbf',
  '4c732b14-bb4e-4aac-97aa-8a877ffe0ace',
  '0a257f6f-559e-404a-b13d-58c6605ec7d9',
  'dc17e4f8-a191-4411-ab02-407d6d8ab5e9',
  '9e5d6db5-91cb-4cde-8b25-98053c21864f',
  'bbd68121-996a-4904-8922-979a2b392c46'
];

// Additional users shown in the image
const additionalUsers = [
  'bbd6f8121-996e-49d4-8922-979a2b392c46',
  '9e5d66bf-9c3b-4cde-8b25-98053c21864f',
  'dc17e4f8-a19f-4411-abd2-407d6d8a5e9',
  '0a257f6f-559e-404a-b13d-58c6605ec7d9',
  '4c732b14-bb4e-4aac-97aa-8a877ffe0ace',
  '4d5aa31f-4a2c-46ed-b97a-d7fcddd2ebbf',
  'd552a5c0-ffd3-4523-a237-d7bb8f46ec56'
];

// Combine both lists, remove duplicates
const allUsersToDelete = [...new Set([...usersToDelete, ...additionalUsers])];

/**
 * Delete multiple user accounts by ID
 */
export const deleteMultipleUserAccounts = async (userIds: string[]): Promise<void> => {
  let successCount = 0;
  let errorCount = 0;
  
  console.log(`Tentative de suppression de ${userIds.length} utilisateurs...`);
  
  for (const userId of userIds) {
    try {
      await deleteSpecificUserAccount(userId);
      successCount++;
      console.log(`Utilisateur ${userId} supprimé avec succès (${successCount}/${userIds.length})`);
    } catch (error) {
      errorCount++;
      console.error(`Erreur lors de la suppression de l'utilisateur ${userId}: ${error}`);
    }
  }
  
  console.log(`Suppression terminée: ${successCount} réussites, ${errorCount} échecs`);
};

/**
 * Execute the deletion of specific users
 */
export const deleteSpecificUsers = async (): Promise<void> => {
  await deleteMultipleUserAccounts(allUsersToDelete);
};

/**
 * Execute the deletion of the specific user with the provided ID
 * This function is specific to the user asked to be deleted
 */
export const deleteSpecificProblemUser = async (): Promise<void> => {
  const specificUserId = "82cecd7c-b299-4fbf-b6e2-4fd9428a9d66";
  await deleteSpecificUserAccount(specificUserId);
};
