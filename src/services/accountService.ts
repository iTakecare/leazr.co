
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Partner } from "./partnerService";
import { Ambassador } from "./ambassadorService";
import { sendWelcomeEmail, sendInvitationEmail } from "./emailService";
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
    console.log(`Creating account invitation for ${userType} with email ${entity.email}`);
    
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
    
    // Créer le compte utilisateur avec l'API Admin (sans email automatique)
    const adminClient = getAdminSupabaseClient();
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    
    // Important: Set proper role in user_metadata 
    const metadata: Record<string, any> = { 
      name: entity.name,
      role: userType === "partner" ? "partner" : userType === "ambassador" ? "ambassador" : "client",
    };
    
    // Add the entity ID to user metadata
    if (userType === "partner" && entity.id) {
      metadata.partner_id = entity.id;
    } else if (userType === "ambassador" && entity.id) {
      metadata.ambassador_id = entity.id;
    } else if (userType === "client" && entity.id) {
      metadata.client_id = entity.id;
    }
    
    // Créer l'utilisateur avec l'API Admin (aucun email automatique envoyé)
    const { data, error: createError } = await adminClient.auth.admin.createUser({
      email: entity.email,
      password: tempPassword,
      email_confirm: true, // Confirmer l'email directement
      user_metadata: metadata
    });
    
    if (createError) {
      console.error("Erreur lors de la création de l'utilisateur:", createError);
      toast.error(`Erreur: ${createError.message}`);
      return false;
    }
    
    if (!data || !data.user) {
      console.error("Création de l'utilisateur n'a pas retourné les données attendues");
      toast.error("Erreur lors de la création du compte");
      return false;
    }
    
    console.log("Utilisateur créé avec succès (sans email automatique):", data.user.id);
    
    // Update the entity with the user ID in the database
    const tableName = userType === "partner" ? "partners" : userType === "ambassador" ? "ambassadors" : "clients";
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update({
        has_user_account: true,
        user_account_created_at: new Date().toISOString(),
        user_id: data.user.id
      })
      .eq('id', entity.id);
    
    if (updateError) {
      console.error(`Erreur lors de la mise à jour du ${userType}:`, updateError);
      toast.error(`Erreur lors de la mise à jour: ${updateError.message}`);
      return false;
    }
    
    // Générer un lien de réinitialisation avec l'API Admin (sans email automatique)
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: entity.email,
      options: {
        redirectTo: `${window.location.origin}/update-password`
      }
    });
    
    if (linkError || !linkData?.properties?.action_link) {
      console.error("Erreur lors de la génération du lien d'authentification:", linkError);
      toast.error("Erreur lors de l'envoi de l'invitation");
      return false;
    }
    
    // Envoyer uniquement l'email d'invitation personnalisé avec le lien généré
    await sendInvitationEmail(entity.email, entity.name, userType, linkData.properties.action_link);
    
    toast.success(`Compte ${userType} créé et invitation envoyée`);
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
    // Utiliser l'URL complète pour la redirection vers la page de mise à jour du mot de passe
    const redirectUrl = `${window.location.origin}/update-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
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
    
    // Delete profile record
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    
    if (profileDeleteError) {
      console.error("Error deleting profile:", profileDeleteError);
      // Continue with the process even if profile deletion fails
    }
    
    // Use Supabase edge function to delete user from auth.users
    try {
      const { error: userDeleteError } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId }
      });
      
      if (userDeleteError) {
        console.error("Error deleting user via edge function:", userDeleteError);
        toast.error(`Error: ${userDeleteError.message}`);
        return false;
      }
      
      toast.success("User account deleted successfully");
      return true;
    } catch (edgeFunctionError) {
      console.error("Error calling delete user edge function:", edgeFunctionError);
      toast.error("Error deleting user");
      return false;
    }
  } catch (error) {
    console.error("Error in deleteUserAccount:", error);
    toast.error("Error deleting user account");
    return false;
  }
};
