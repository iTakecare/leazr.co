
import { adminSupabase, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Partner } from "./partnerService";
import { Ambassador } from "./ambassadorService";
import { sendWelcomeEmail } from "./emailService";
import { Client } from "@/types/client";

interface CreateAccountParams {
  email: string;
  name: string;
  role: string;
  userType: "partner" | "ambassador" | "client";
  entityId: string;
}

type EntityType = Partner | Ambassador | Client;

/**
 * Create a user account for a partner, ambassador or client
 */
export const createUserAccount = async (
  entity: EntityType,
  userType: "partner" | "ambassador" | "client"
): Promise<boolean> => {
  if (!entity.email) {
    toast.error(
      `Ce ${userType === "partner" ? "partenaire" : userType === "ambassador" ? "ambassadeur" : "client"} n'a pas d'adresse email`
    );
    return false;
  }

  try {
    console.log(`Creating account for ${userType} with email ${entity.email}`);
    
    // Vérifier si l'utilisateur existe déjà en utilisant auth.users
    const { data: userExists, error: checkError } = await supabase.rpc(
      'check_user_exists_by_email',
      { user_email: entity.email }
    );
    
    if (checkError) {
      console.error("Erreur lors de la vérification de l'utilisateur:", checkError);
      toast.error(`Erreur lors de la vérification: ${checkError.message}`);
      return false;
    }
    
    if (userExists) {
      console.log(`Un compte existe déjà avec l'email ${entity.email}`);
      toast.error(`Un compte existe déjà avec cette adresse email`);
      return false;
    }
    
    // Générer un mot de passe aléatoire
    const tempPassword = Math.random().toString(36).slice(-12);
    
    // Créer l'utilisateur avec le client standard - le service_role est configuré côté serveur
    const { data: userData, error: createError } = await supabase.auth.signUp({
      email: entity.email,
      password: tempPassword,
      options: {
        data: { 
          name: entity.name,
          // Utiliser la valeur appropriée pour le champ role
          // Important: Ce champ doit correspondre aux valeurs acceptées par la contrainte profiles_role_check
          role: userType === "partner" ? "partner" : userType === "ambassador" ? "ambassador" : "client",
          [userType === "partner" ? "partner_id" : userType === "ambassador" ? "ambassador_id" : "client_id"]: entity.id
        }
      }
    });
    
    if (createError) {
      console.error("Erreur lors de la création de l'utilisateur:", createError);
      toast.error(`Erreur: ${createError.message}`);
      return false;
    }
    
    if (!userData || !userData.user) {
      console.error("Création de l'utilisateur n'a pas retourné les données attendues");
      toast.error("Erreur lors de la création du compte");
      return false;
    }
    
    console.log("Utilisateur créé avec succès:", userData.user.id);
    
    // Mettre à jour l'entité dans la base de données
    // Utiliser le client standard supabase au lieu de adminSupabase qui semble avoir des problèmes d'authentification
    const tableName = userType === "partner" ? "partners" : userType === "ambassador" ? "ambassadors" : "clients";
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        has_user_account: true,
        user_account_created_at: new Date().toISOString(),
        user_id: userData.user.id
      })
      .eq('id', entity.id);
    
    if (updateError) {
      console.error(`Erreur lors de la mise à jour du ${userType}:`, updateError);
      toast.error(`Erreur lors de la mise à jour: ${updateError.message}`);
      return false;
    }
    
    // Ne plus envoyer l'email de réinitialisation de mot de passe automatiquement
    // Décommenter la ligne ci-dessous si l'envoi d'email de réinitialisation est nécessaire
    /*
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(entity.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    
    if (resetError) {
      console.error("Erreur lors de l'envoi de l'email de réinitialisation:", resetError);
      toast.warning("Compte créé mais problème d'envoi de l'email de réinitialisation");
      // On continue malgré cette erreur
    }
    */
    
    // Envoyer l'email de bienvenue via notre système SMTP
    await sendWelcomeEmail(entity.email, entity.name, userType);
    
    toast.success(`Compte ${userType} créé et email de bienvenue envoyé`);
    return true;
  } catch (error) {
    console.error(`Erreur dans createUserAccount:`, error);
    toast.error(`Erreur lors de la création du compte ${userType}`);
    return false;
  }
};

/**
 * Reset password for a user
 */
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    
    if (error) {
      console.error("Error sending reset password email:", error);
      toast.error(`Erreur: ${error.message}`);
      return false;
    }
    
    toast.success("Email de réinitialisation envoyé avec succès");
    return true;
  } catch (error) {
    console.error("Error in resetPassword:", error);
    toast.error("Erreur lors de l'envoi de l'email de réinitialisation");
    return false;
  }
};

/**
 * Delete a user account by ID
 * This function first ensures all references to the user are removed,
 * then deletes the profile record, and finally removes the user
 */
export const deleteUserAccount = async (userId: string): Promise<boolean> => {
  try {
    console.log(`Attempting to delete user with ID: ${userId}`);
    
    // First, check if the user exists
    const { data: userExists, error: checkError } = await supabase.rpc(
      'check_user_exists_by_id',
      { user_id: userId }
    );
    
    if (checkError) {
      console.error("Error checking if user exists:", checkError);
      toast.error(`Error checking user: ${checkError.message}`);
      return false;
    }
    
    if (!userExists) {
      console.log(`User with ID ${userId} does not exist`);
      toast.error("User not found");
      return false;
    }

    // Remove associations in related tables
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
        console.error(`Error removing user association from ${table}:`, updateError);
        // Continue with the deletion process even if this fails
      }
    }
    
    // Delete profile record using direct SQL (more reliable)
    try {
      const { error: profileDeleteError } = await supabase.rpc(
        'execute_sql',
        { sql: `DELETE FROM public.profiles WHERE id = '${userId}'` }
      );
      
      if (profileDeleteError) {
        console.error("Error deleting profile via SQL:", profileDeleteError);
        toast.error(`Error: ${profileDeleteError.message}`);
        return false;
      }
    } catch (sqlExecError) {
      console.error("Error executing SQL to delete profile:", sqlExecError);
      toast.error("Error deleting profile");
      return false;
    }
    
    // Delete user using direct SQL (more reliable than API)
    try {
      const { error: userDeleteError } = await supabase.rpc(
        'execute_sql',
        { sql: `DELETE FROM auth.users WHERE id = '${userId}'` }
      );
      
      if (userDeleteError) {
        console.error("Error deleting user via SQL:", userDeleteError);
        toast.error(`Error: ${userDeleteError.message}`);
        return false;
      }
      
      toast.success("User account deleted successfully");
      return true;
    } catch (sqlExecError) {
      console.error("Error executing SQL to delete user:", sqlExecError);
      toast.error("Error deleting user");
      return false;
    }
  } catch (error) {
    console.error("Error in deleteUserAccount:", error);
    toast.error("Error deleting user account");
    return false;
  }
};
