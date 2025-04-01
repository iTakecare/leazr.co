
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
  const specificUserId = "658bd63c-08d8-428a-9c22-eeeca753dd73";
  await deleteSpecificUserAccount(specificUserId);
};

/**
 * Diagnose user roles and associations
 * Useful for troubleshooting role-related issues
 */
export const diagnoseUserRoles = async (userId: string): Promise<void> => {
  try {
    if (!userId) {
      console.error("Aucun ID utilisateur fourni pour le diagnostic");
      return;
    }
    
    console.log("Démarrage du diagnostic des rôles pour l'utilisateur:", userId);
    
    // Check profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (profileError) {
      console.error("Erreur lors de la récupération du profil:", profileError);
    } else {
      console.log("Profil trouvé:", profile);
    }
    
    // Check client association
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId);
      
    if (clientError) {
      console.error("Erreur lors de la vérification de l'association client:", clientError);
    } else {
      console.log("Associations client trouvées:", clientData);
      
      if (clientData.length === 0) {
        console.log("Aucune association client trouvée pour cet utilisateur");
      }
    }
    
    // Check partner association
    const { data: partnerData, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('user_id', userId);
      
    if (partnerError) {
      console.error("Erreur lors de la vérification de l'association partenaire:", partnerError);
    } else {
      console.log("Associations partenaire trouvées:", partnerData);
    }
    
    // Check ambassador association
    const { data: ambassadorData, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('user_id', userId);
      
    if (ambassadorError) {
      console.error("Erreur lors de la vérification de l'association ambassadeur:", ambassadorError);
    } else {
      console.log("Associations ambassadeur trouvées:", ambassadorData);
    }
    
    console.log("Diagnostic des rôles terminé pour l'utilisateur:", userId);
  } catch (error) {
    console.error("Erreur lors du diagnostic des rôles:", error);
  }
};
