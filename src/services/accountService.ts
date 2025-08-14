
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Ambassador } from "./ambassadorService";
import { sendWelcomeEmail, sendInvitationEmail } from "./emailService";
import { Client } from "@/types/client";

interface CreateAccountParams {
  email: string;
  name: string;
  role: string;
  userType: "ambassador" | "client";
  entityId: string;
}

type EntityType = Ambassador | Client;

/**
 * Create a user account for a partner, ambassador or client
 */
export const createUserAccount = async (
  entity: EntityType,
  userType: "ambassador" | "client"
): Promise<boolean> => {
  if (!entity.email) {
    toast.error(
      `Ce ${userType === "ambassador" ? "ambassadeur" : "client"} n'a pas d'adresse email`
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
    
    // Créer le compte utilisateur avec signUp (sans email automatique)
    const tempPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
    
    // Important: Set proper role in user_metadata 
    const metadata: Record<string, any> = { 
      name: entity.name,
      role: userType === "ambassador" ? "ambassador" : "client",
    };
    
    // Add the entity ID to user metadata
    if (userType === "ambassador" && entity.id) {
      metadata.ambassador_id = entity.id;
    } else if (userType === "client" && entity.id) {
      metadata.client_id = entity.id;
    }
    
    // Utiliser notre edge function personnalisée pour créer le compte avec Resend
    const { data, error: createError } = await supabase.functions.invoke('create-account-custom', {
      body: {
        email: entity.email,
        entityType: userType,
        entityId: entity.id,
        companyId: (entity as any).company_id,
        firstName: entity.name?.split(' ')[0] || '',
        lastName: entity.name?.split(' ').slice(1).join(' ') || '',
        role: userType
      }
    });
    
    if (createError) {
      console.error("Erreur lors de la création de l'utilisateur:", createError);
      toast.error(`Erreur: ${createError.message}`);
      return false;
    }
    
    if (!data || !data.success) {
      console.error("Erreur lors de la création du compte:", data?.error || "Réponse inattendue");
      toast.error(`Erreur: ${data?.error || "Erreur lors de la création du compte"}`);
      return false;
    }
    
    console.log("Utilisateur créé avec succès via notre edge function:", data.user_id);
    
    // L'edge function s'occupe déjà de mettre à jour l'entité et d'envoyer l'email
    // Pas besoin de faire des opérations supplémentaires ici
    
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
    // Utiliser notre edge function personnalisée pour la réinitialisation via Resend
    const { data, error } = await supabase.functions.invoke('custom-password-reset', {
      body: { email }
    });
    
    if (error) {
      console.error("Error sending custom reset password email:", error);
      toast.error(`Erreur: ${error.message}`);
      return false;
    }
    
    if (!data || !data.success) {
      console.error("Erreur lors de la réinitialisation:", data?.error || "Réponse inattendue");
      toast.error(`Erreur: ${data?.error || "Erreur lors de la réinitialisation"}`);
      return false;
    }
    
    toast.success("Email de réinitialisation envoyé avec succès via Resend");
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
    const tables = ['clients', 'ambassadors'];
    
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
