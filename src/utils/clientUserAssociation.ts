
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Vérifie et corrige l'association entre un client et son utilisateur
 * @param clientId - L'ID du client à vérifier/corriger
 * @returns Promise<{ success: boolean, message: string }>
 */
export const fixIncorrectUserAssociation = async (clientId: string) => {
  try {
    console.log("Début de la vérification de l'association client-utilisateur:", clientId);

    // 1. Récupérer les informations du client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error("Erreur lors de la récupération du client:", clientError);
      return { success: false, message: "Client introuvable" };
    }

    if (!client.email) {
      return { success: false, message: "Le client n'a pas d'adresse email" };
    }

    // 2. Récupérer l'utilisateur correspondant par email
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserByEmail(
      client.email
    );

    if (userError) {
      console.error("Erreur lors de la récupération de l'utilisateur:", userError);
      return { success: false, message: "Utilisateur introuvable" };
    }

    if (!user) {
      // Réinitialiser les champs liés au compte utilisateur
      const { error: updateError } = await supabase
        .from('clients')
        .update({
          user_id: null,
          has_user_account: false,
          user_account_created_at: null
        })
        .eq('id', clientId);

      if (updateError) {
        console.error("Erreur lors de la réinitialisation:", updateError);
        return { success: false, message: "Erreur lors de la réinitialisation" };
      }

      return { 
        success: true, 
        message: "Association réinitialisée - aucun utilisateur trouvé avec cet email" 
      };
    }

    // 3. Vérifier si l'ID utilisateur actuel est correct
    if (client.user_id === user.id) {
      return { 
        success: true, 
        message: "L'association client-utilisateur est déjà correcte" 
      };
    }

    // 4. Mettre à jour le client avec le bon user_id
    const { error: updateError } = await supabase
      .from('clients')
      .update({
        user_id: user.id,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', clientId);

    if (updateError) {
      console.error("Erreur lors de la mise à jour:", updateError);
      return { success: false, message: "Erreur lors de la mise à jour" };
    }

    console.log(`Association corrigée pour le client ${clientId} avec l'utilisateur ${user.id}`);
    return { 
      success: true, 
      message: `Association corrigée - ID utilisateur mis à jour: ${user.id}` 
    };

  } catch (error) {
    console.error("Erreur lors de la correction de l'association:", error);
    return { success: false, message: "Erreur inattendue lors de la correction" };
  }
};

