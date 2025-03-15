
import { supabase } from "@/integrations/supabase/client";
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
    
    const params: CreateAccountParams = {
      email: entity.email,
      name: userType === "partner" ? entity.name : entity.name,
      role: userType,
      userType,
      entityId: entity.id
    };

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("create-user-account", {
      body: params
    });
    
    if (error) {
      console.error(`Error creating ${userType} account:`, error);
      toast.error(`Erreur lors de la création du compte : ${error.message}`);
      return false;
    }
    
    if (data?.error) {
      console.error(`Error from edge function:`, data.error);
      
      if (data.userExists) {
        toast.error(`Un compte existe déjà avec cette adresse email`);
      } else {
        toast.error(`Erreur: ${data.error}`);
      }
      return false;
    }
    
    toast.success(`Compte ${userType} créé et email de configuration envoyé`);
    return true;
  } catch (error) {
    console.error(`Error in createUserAccount:`, error);
    toast.error(`Erreur lors de la création du compte ${userType}`);
    return false;
  }
};

/**
 * Reset password for a user
 */
export const resetPassword = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
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
