
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
    
    // Try to delete profile record using SQL execution
    try {
      const { error: profileDeleteError } = await supabase.rpc(
        'execute_sql',
        { sql: `DELETE FROM public.profiles WHERE id = '${userId}'` }
      );
      
      if (profileDeleteError) {
        console.error("Erreur lors de la suppression du profil via SQL:", profileDeleteError);
        toast.error(`Erreur: ${profileDeleteError.message}`);
        return;
      } else {
        console.log("Profil supprimé avec succès via SQL");
      }
    } catch (sqlExecError) {
      console.error("Erreur lors de l'exécution SQL pour supprimer le profil:", sqlExecError);
      toast.error("Erreur lors de la suppression du profil");
      return;
    }
    
    // Delete the user using SQL execution
    try {
      const { error: userDeleteError } = await supabase.rpc(
        'execute_sql',
        { sql: `DELETE FROM auth.users WHERE id = '${userId}'` }
      );
      
      if (userDeleteError) {
        console.error("Erreur lors de la suppression de l'utilisateur via SQL:", userDeleteError);
        toast.error(`Erreur: ${userDeleteError.message}`);
      } else {
        toast.success("Compte utilisateur supprimé avec succès");
      }
    } catch (sqlExecError) {
      console.error("Erreur lors de l'exécution SQL pour supprimer l'utilisateur:", sqlExecError);
      toast.error("Erreur lors de la suppression de l'utilisateur");
    }
  } catch (error) {
    console.error("Erreur dans deleteSpecificUserAccount:", error);
    toast.error("Erreur lors de la suppression du compte utilisateur");
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
