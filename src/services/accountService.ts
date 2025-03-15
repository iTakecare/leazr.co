
import { adminSupabase, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Partner } from "./partnerService";
import { Ambassador } from "./ambassadorService";
import { sendWelcomeEmail } from "./emailService";

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
    
    console.log("User exists check result:", userExists);
    let userId = null;
    
    if (userExists) {
      console.log(`Un compte existe déjà avec l'email ${entity.email}`);
      
      // Récupérer l'ID de l'utilisateur existant
      const { data: existingUserId, error: userIdError } = await supabase.rpc(
        'get_user_id_by_email',
        { user_email: entity.email }
      );
      
      if (userIdError) {
        console.error("Erreur lors de la récupération de l'ID utilisateur:", userIdError);
        toast.error(`Erreur: ${userIdError.message}`);
        return false;
      }
      
      userId = existingUserId;
      console.log(`Utilisateur existant trouvé: ${userId}`);
    } else {
      // Générer un mot de passe aléatoire
      const tempPassword = Math.random().toString(36).slice(-12);
      
      // Créer l'utilisateur avec le client standard - le service_role est configuré côté serveur
      const { data: userData, error: createError } = await supabase.auth.signUp({
        email: entity.email,
        password: tempPassword,
        options: {
          data: { 
            name: entity.name,
            role: userType,
            [userType === "partner" ? "partner_id" : "ambassador_id"]: entity.id
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
      
      userId = userData.user.id;
      console.log("Utilisateur créé avec succès:", userId);
    }
    
    // Mettre à jour le partenaire ou ambassadeur dans la base de données
    const tableName = userType === "partner" ? "partners" : "ambassadors";
    
    // Log pour débogage
    console.log(`Mise à jour de ${tableName} avec id=${entity.id}, user_id=${userId}, has_user_account=true`);
    
    // Vérifier d'abord si l'entité existe
    const { data: entityCheck, error: checkEntityError } = await supabase
      .from(tableName)
      .select('id')
      .eq('id', entity.id)
      .single();
      
    if (checkEntityError) {
      console.error(`Erreur lors de la vérification de l'existence du ${userType}:`, checkEntityError);
      toast.error(`Erreur: ${checkEntityError.message}`);
      return false;
    }
    
    if (!entityCheck) {
      console.error(`${userType} avec ID ${entity.id} non trouvé dans la base de données`);
      toast.error(`${userType} non trouvé`);
      return false;
    }
    
    // Effectuer la mise à jour avec le client adminSupabase pour s'assurer que les mises à jour sont immédiates
    const updateData = {
      has_user_account: true,
      user_account_created_at: new Date().toISOString(),
      user_id: userId
    };
    
    console.log(`Données de mise à jour:`, updateData);
    
    const { error: updateError } = await adminSupabase
      .from(tableName)
      .update(updateData)
      .eq('id', entity.id);
    
    if (updateError) {
      console.error(`Erreur lors de la mise à jour du ${userType}:`, updateError);
      toast.error(`Erreur lors de la mise à jour: ${updateError.message}`);
      return false;
    }
    
    // Vérifier que la mise à jour a bien été effectuée
    const { data: updatedEntity, error: verifyError } = await adminSupabase
      .from(tableName)
      .select('*')
      .eq('id', entity.id)
      .single();
      
    if (verifyError) {
      console.error(`Erreur lors de la vérification de la mise à jour:`, verifyError);
      toast.warning("La mise à jour du statut du compte pourrait ne pas être immédiatement visible.");
    } else {
      console.log(`État mis à jour du ${userType}:`, updatedEntity);
      
      if (!updatedEntity.has_user_account) {
        console.error("⚠️ La mise à jour du statut du compte n'a pas été enregistrée!");
        toast.warning("Problème avec la mise à jour du statut du compte, veuillez actualiser la page.");
      }
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
