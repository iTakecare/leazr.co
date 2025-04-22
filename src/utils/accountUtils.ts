
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    
    // First update related entities to remove user_id references
    const tables = ['clients', 'partners', 'ambassadors'];
    
    for (const table of tables) {
      const { error: updateError } = await supabase
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
    }
    
    // Use the edge function to delete the user
    console.log(`Appel de l'edge function pour supprimer l'utilisateur ${userId}`);
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { user_id: userId }
    });
    
    if (error) {
      console.error("Erreur lors de l'appel à l'edge function:", error);
      throw new Error(`Erreur: ${error.message}`);
    }
    
    console.log("Utilisateur supprimé avec succès");
    
  } catch (error) {
    console.error("Erreur dans deleteSpecificUserAccount:", error);
    throw error; // Rethrow the error to be caught by the caller
  }
};

/**
 * Execute the deletion of the specific user with the provided ID
 * This function is specific to the user asked to be deleted
 */
export const deleteSpecificProblemUser = async (): Promise<void> => {
  const specificUserId = "82cecd7c-b299-4fbf-b6e2-4fd9428a9d66";
  await deleteSpecificUserAccount(specificUserId);
};

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

/**
 * Execute the deletion of specific users
 */
export const deleteSpecificUsers = async (): Promise<void> => {
  await deleteMultipleUserAccounts(usersToDelete);
};
