
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
    
    // Envoyer l'email de réinitialisation de mot de passe - en utilisant le client standard
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(entity.email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    
    if (resetError) {
      console.error("Erreur lors de l'envoi de l'email de réinitialisation:", resetError);
      toast.warning("Compte créé mais problème d'envoi de l'email de réinitialisation");
      // On continue malgré cette erreur
    }
    
    // Envoyer l'email de bienvenue via notre système SMTP
    await sendWelcomeEmail(entity.email, entity.name, userType);
    
    toast.success(`Compte ${userType} créé et emails envoyés`);
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
