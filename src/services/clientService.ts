import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Fonction pour créer un compte client à partir d'un objet client
export const createAccountForClient = async (clientId: string) => {
  try {
    const adminSupabase = getAdminSupabaseClient();
    
    // Récupérer les informations du client
    const { data: client, error: clientError } = await adminSupabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single();
    
    if (clientError || !client) {
      throw new Error("Client non trouvé");
    }
    
    // Vérifier si l'utilisateur existe déjà
    if (client.user_id) {
      return { success: true, message: "Ce client a déjà un compte utilisateur" };
    }
    
    // Vérifier si l'email est valide
    if (!client.email) {
      throw new Error("L'email du client n'est pas défini");
    }
    
    // Générer un mot de passe temporaire
    const tempPassword = Math.random().toString(36).slice(-8);
    
    // Créer un compte utilisateur
    const { data: user, error } = await adminSupabase.auth.admin.createUser({
      email: client.email,
      password: tempPassword,
      email_confirm: true, // Confirmer l'email automatiquement
      user_metadata: {
        full_name: client.name,
        role: 'client'
      }
    });
    
    if (error) {
      throw error;
    }
    
    // Mettre à jour le client avec l'identifiant utilisateur
    const { error: updateError } = await adminSupabase
      .from('clients')
      .update({
        user_id: user.user.id,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', client.id);
    
    if (updateError) {
      throw updateError;
    }
    
    // Envoyer un email avec le mot de passe temporaire
    // Note: cette fonctionnalité nécessiterait un service d'envoi d'emails
    
    return {
      success: true,
      user: user.user,
      message: "Compte utilisateur créé avec succès"
    };
  } catch (error: any) {
    console.error("Erreur lors de la création du compte:", error);
    return {
      success: false,
      message: error.message || "Erreur lors de la création du compte utilisateur"
    };
  }
};

// Fonction pour réinitialiser le mot de passe d'un utilisateur
export const resetPassword = async (email: string) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    
    if (error) throw error;
    
    return {
      success: true,
      message: "Instructions de réinitialisation envoyées"
    };
  } catch (error: any) {
    console.error("Erreur lors de la réinitialisation du mot de passe:", error);
    return {
      success: false,
      message: error.message || "Erreur lors de la réinitialisation"
    };
  }
};

// Verifier un numéro de TVA (version simplifiée)
export const clientService = {
  verifyVatNumber: async (vatNumber: string) => {
    try {
      console.log("Verification VAT number:", vatNumber);
      // Pour une demo, on accepte tous les numéros commençant par BE
      if (vatNumber.toUpperCase().startsWith('BE')) {
        // Simuler un délai de réseau
        await new Promise(resolve => setTimeout(resolve, 800));
        
        return {
          valid: true,
          companyName: vatNumber.toUpperCase().startsWith('BE0123') 
            ? "Test Company SA"
            : "Entreprise " + vatNumber.substring(2, 6)
        };
      }
      
      return {
        valid: false,
        error: "Format de TVA invalide"
      };
    } catch (error) {
      console.error("Erreur de vérification TVA:", error);
      return {
        valid: false,
        error: "Erreur lors de la vérification"
      };
    }
  },
  
  // Ajouter ici les autres méthodes du service client
};
