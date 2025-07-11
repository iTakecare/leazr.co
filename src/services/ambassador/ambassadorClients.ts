
import { supabase } from "@/integrations/supabase/client";

/**
 * Récupère les clients d'un ambassadeur spécifique en utilisant la fonction sécurisée
 * Cette fonction contourne les problèmes RLS
 */
export const getAmbassadorClientsSecure = async (ambassadorId: string) => {
  try {
    console.log("🔒 getAmbassadorClientsSecure - Récupération pour ambassadeur:", ambassadorId);
    
    // Utiliser la fonction RPC sécurisée existante
    const { data, error } = await supabase.rpc('get_ambassador_clients_secure', {
      p_user_id: ambassadorId // Note: cette fonction attend un user_id, pas un ambassador_id
    });

    if (error) {
      console.error("❌ Erreur RPC get_ambassador_clients_secure:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("⚠️ Aucun client trouvé pour cet ambassadeur via RPC");
      return [];
    }

    // Formatter les données pour correspondre au format attendu
    const formattedClients = data.map(client => ({
      id: client.client_id,
      name: client.client_name,
      email: client.client_email || '',
      company: client.client_company || '',
      companyName: client.client_company || '',
      phone: client.client_phone,
      address: client.client_address,
      city: client.client_city,
      postal_code: client.client_postal_code,
      country: client.client_country,
      vat_number: client.client_vat_number,
      notes: client.client_notes,
      status: client.client_status,
      created_at: new Date(client.client_created_at),
      updated_at: new Date(client.client_updated_at),
      user_id: client.client_user_id,
      has_user_account: client.client_has_user_account,
      company_id: client.client_company_id,
      ambassador: {
        id: ambassadorId,
        name: 'Ambassadeur' // On pourrait enrichir avec le nom réel si nécessaire
      }
    }));

    console.log("✅ Clients d'ambassadeur formatés:", formattedClients);
    return formattedClients;

  } catch (error) {
    console.error("❌ Exception dans getAmbassadorClientsSecure:", error);
    return [];
  }
};

/**
 * Récupère les clients d'un ambassadeur en utilisant l'ID de l'ambassadeur
 * Cette fonction fait le lien entre l'ID ambassadeur et l'ID utilisateur
 */
export const getClientsByAmbassadorId = async (ambassadorId: string) => {
  try {
    console.log("🔍 getClientsByAmbassadorId - Récupération pour ID ambassadeur:", ambassadorId);
    
    // D'abord, récupérer l'user_id de l'ambassadeur
    const { data: ambassadorData, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('user_id, name')
      .eq('id', ambassadorId)
      .single();

    if (ambassadorError || !ambassadorData) {
      console.error("❌ Erreur lors de la récupération de l'ambassadeur:", ambassadorError);
      return [];
    }

    if (!ambassadorData.user_id) {
      console.log("⚠️ Ambassadeur sans user_id associé");
      return [];
    }

    console.log("🔍 User ID trouvé pour l'ambassadeur:", ambassadorData.user_id);

    // Utiliser la fonction sécurisée avec l'user_id
    const { data, error } = await supabase.rpc('get_ambassador_clients_secure', {
      p_user_id: ambassadorData.user_id
    });

    if (error) {
      console.error("❌ Erreur RPC get_ambassador_clients_secure:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("⚠️ Aucun client trouvé pour cet ambassadeur");
      return [];
    }

    // Formatter les données avec les informations de l'ambassadeur
    const formattedClients = data.map(client => ({
      id: client.client_id,
      name: client.client_name,
      email: client.client_email || '',
      company: client.client_company || '',
      companyName: client.client_company || '',
      phone: client.client_phone,
      address: client.client_address,
      city: client.client_city,
      postal_code: client.client_postal_code,
      country: client.client_country,
      vat_number: client.client_vat_number,
      notes: client.client_notes,
      status: client.client_status,
      created_at: new Date(client.client_created_at),
      updated_at: new Date(client.client_updated_at),
      user_id: client.client_user_id,
      has_user_account: client.client_has_user_account,
      company_id: client.client_company_id,
      ambassador: {
        id: ambassadorId,
        name: ambassadorData.name || 'Ambassadeur'
      }
    }));

    console.log("✅ Clients d'ambassadeur formatés via ID:", formattedClients);
    return formattedClients;

  } catch (error) {
    console.error("❌ Exception dans getClientsByAmbassadorId:", error);
    return [];
  }
};

/**
 * Fonction d'alias pour maintenir la compatibilité
 * Utilise getClientsByAmbassadorId mais attend un user_id
 */
export const getAmbassadorClients = async (userId?: string) => {
  try {
    if (!userId) {
      console.warn("⚠️ getAmbassadorClients appelé sans userId");
      return [];
    }
    
    // Essayer de trouver l'ambassadeur par user_id
    const { data: ambassadorData, error } = await supabase
      .from('ambassadors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error("❌ Erreur lors de la recherche d'ambassadeur pour user_id:", userId, error);
      return [];
    }
    
    if (!ambassadorData) {
      console.log("⚠️ Utilisateur n'est pas un ambassadeur:", userId);
      return [];
    }
    
    return await getClientsByAmbassadorId(ambassadorData.id);
  } catch (error) {
    console.error("❌ Exception dans getAmbassadorClients:", error);
    return [];
  }
};

/**
 * Supprime un client d'un ambassadeur
 */
export const deleteAmbassadorClient = async (clientId: string) => {
  try {
    console.log("🗑️ Suppression du client ambassadeur:", clientId);
    
    // Supprimer le lien dans ambassador_clients
    const { error: linkError } = await supabase
      .from('ambassador_clients')
      .delete()
      .eq('client_id', clientId);
    
    if (linkError) {
      console.error("❌ Erreur lors de la suppression du lien ambassadeur-client:", linkError);
      throw linkError;
    }
    
    // Optionnellement, supprimer le client lui-même si nécessaire
    // Pour l'instant, on garde juste le détachement
    
    console.log("✅ Client détaché de l'ambassadeur avec succès");
    return true;
  } catch (error) {
    console.error("❌ Exception dans deleteAmbassadorClient:", error);
    throw error;
  }
};

/**
 * Lie un client à un ambassadeur
 */
export const linkClientToAmbassador = async (clientId: string, ambassadorId: string) => {
  try {
    console.log("🔗 Liaison client-ambassadeur:", { clientId, ambassadorId });
    
    // Vérifier si le lien existe déjà
    const { data: existingLink } = await supabase
      .from('ambassador_clients')
      .select('id')
      .eq('client_id', clientId)
      .eq('ambassador_id', ambassadorId)
      .single();
    
    if (existingLink) {
      console.log("⚠️ Lien client-ambassadeur déjà existant");
      return true;
    }
    
    // Créer le lien
    const { error } = await supabase
      .from('ambassador_clients')
      .insert({
        client_id: clientId,
        ambassador_id: ambassadorId
      });
    
    if (error) {
      console.error("❌ Erreur lors de la création du lien:", error);
      throw error;
    }
    
    console.log("✅ Client lié à l'ambassadeur avec succès");
    return true;
  } catch (error) {
    console.error("❌ Exception dans linkClientToAmbassador:", error);
    throw error;
  }
};
