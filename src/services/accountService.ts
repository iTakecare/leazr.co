
import { adminSupabase, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Partner } from "./partnerService";
import { Ambassador } from "./ambassadorService";

interface CreateAccountParams {
  email: string;
  name: string;
  role: string;
  userType: "partner" | "ambassador";
  entityId: string;
}

/**
 * Create a user account for a partner or ambassador
 */
export const createUserAccount = async (
  entity: Partner | Ambassador,
  userType: "partner" | "ambassador"
): Promise<boolean> => {
  if (!entity.email) {
    toast.error(
      userType === "partner"
        ? "Ce partenaire n'a pas d'adresse email"
        : "Cet ambassadeur n'a pas d'adresse email"
    );
    return false;
  }

  try {
    console.log(`Creating account for ${userType} with email ${entity.email}`);
    
    // Check if user exists by email with adminSupabase
    const { data, error: findError } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', entity.email)
      .single();
    
    if (findError && findError.code !== 'PGRST116') {
      console.error("Erreur lors de la vérification de l'utilisateur:", findError);
      toast.error(`Erreur lors de la vérification: ${findError.message}`);
      return false;
    }
    
    if (data) {
      console.log(`Un compte existe déjà avec l'email ${entity.email}`);
      toast.error(`Un compte existe déjà avec cette adresse email`);
      return false;
    }
    
    // Generate a random password
    const tempPassword = Math.random().toString(36).slice(-12);
    
    // Create user account with admin client
    const { data: userData, error: createError } = await adminSupabase.auth.admin.createUser({
      email: entity.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { 
        name: entity.name,
        role: userType,
        [userType === "partner" ? "partner_id" : "ambassador_id"]: entity.id
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
    
    // Update the partner or ambassador in the database
    const tableName = userType === "partner" ? "partners" : "ambassadors";
    
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
    
    // Send password reset email with admin client
    const { error: resetError } = await adminSupabase.auth.admin.generateLink({
      type: "recovery",
      email: entity.email,
      options: {
        redirectTo: `${window.location.origin}/update-password`,
      }
    });
    
    if (resetError) {
      console.error("Erreur lors de l'envoi de l'email de réinitialisation:", resetError);
      toast.warning("Compte créé mais problème d'envoi de l'email de réinitialisation");
      // We continue despite this error
    }
    
    toast.success(`Compte ${userType} créé et email de configuration envoyé`);
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
