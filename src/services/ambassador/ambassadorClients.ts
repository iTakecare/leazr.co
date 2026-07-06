
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
    
    // Récupérer le nom de l'ambassadeur
    const { data: ambassadorData, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('name')
      .eq('id', ambassadorId)
      .single();

    if (ambassadorError) {
      console.error("❌ Erreur lors de la récupération de l'ambassadeur:", ambassadorError);
    }

    // Requêter directement ambassador_clients avec l'ambassador_id
    const { data, error } = await supabase
      .from('ambassador_clients')
      .select(`
        client_id,
        clients (
          id, name, email, company, phone, address, city, 
          postal_code, country, vat_number, notes, status,
          created_at, updated_at, user_id, has_user_account, company_id
        )
      `)
      .eq('ambassador_id', ambassadorId);

    if (error) {
      console.error("❌ Erreur lors de la récupération des clients:", error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log("⚠️ Aucun client trouvé pour cet ambassadeur");
      return [];
    }

    // Formatter les données avec les informations de l'ambassadeur
    const formattedClients = data
      .filter(item => item.clients) // Filtrer les entrées sans client
      .map(item => ({
        id: item.clients.id,
        name: item.clients.name,
        email: item.clients.email || '',
        company: item.clients.company || '',
        companyName: item.clients.company || '',
        phone: item.clients.phone,
        address: item.clients.address,
        city: item.clients.city,
        postal_code: item.clients.postal_code,
        country: item.clients.country,
        vat_number: item.clients.vat_number,
        notes: item.clients.notes,
        status: item.clients.status,
        created_at: new Date(item.clients.created_at),
        updated_at: new Date(item.clients.updated_at),
        user_id: item.clients.user_id,
        has_user_account: item.clients.has_user_account,
        company_id: item.clients.company_id,
        ambassador: {
          id: ambassadorId,
          name: ambassadorData?.name || 'Ambassadeur'
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

    // Appliquer le pré-réglage marketing de l'ambassadeur au client (si le client
    // n'a encore aucune préférence définie — on n'écrase jamais un choix manuel).
    await applyAmbassadorMarketingDefaults(clientId, ambassadorId);

    console.log("✅ Client lié à l'ambassadeur avec succès");
    return true;
  } catch (error) {
    console.error("❌ Exception dans linkClientToAmbassador:", error);
    throw error;
  }
};

/**
 * Copie les préférences marketing par défaut d'un ambassadeur vers un client,
 * uniquement si le client n'a pas encore de préférences (objet vide).
 * Ne bloque jamais la liaison en cas d'erreur.
 */
const applyAmbassadorMarketingDefaults = async (clientId: string, ambassadorId: string) => {
  try {
    const { data: amb } = await supabase
      .from("ambassadors")
      .select("default_marketing_preferences")
      .eq("id", ambassadorId)
      .maybeSingle();

    const defaults = (amb as any)?.default_marketing_preferences as Record<string, boolean> | null;
    if (!defaults || Object.keys(defaults).length === 0) return; // rien à pré-régler

    const { data: client } = await supabase
      .from("clients")
      .select("marketing_preferences")
      .eq("id", clientId)
      .maybeSingle();

    const current = (client as any)?.marketing_preferences as Record<string, boolean> | null;
    if (current && Object.keys(current).length > 0) return; // ne pas écraser un choix existant

    const { error } = await supabase
      .from("clients")
      .update({ marketing_preferences: defaults } as any)
      .eq("id", clientId);
    if (error) {
      console.error("⚠️ Impossible d'appliquer le pré-réglage marketing:", error);
    } else {
      console.log("✅ Pré-réglage marketing de l'ambassadeur appliqué au client");
    }
  } catch (e) {
    console.error("⚠️ Exception applyAmbassadorMarketingDefaults:", e);
  }
};

/**
 * Récupère l'ambassadeur actuellement lié à un client
 */
export const getClientAmbassador = async (clientId: string) => {
  try {
    console.log("🔍 Récupération de l'ambassadeur pour le client:", clientId);
    
    const { data, error } = await supabase
      .from('ambassador_clients')
      .select(`
        ambassador_id,
        ambassadors (
          id,
          name,
          email,
          commission_level_id
        )
      `)
      .eq('client_id', clientId)
      .maybeSingle();
    
    if (error) {
      console.error("❌ Erreur lors de la récupération de l'ambassadeur:", error);
      throw error;
    }
    
    if (!data || !data.ambassadors) {
      console.log("⚠️ Aucun ambassadeur trouvé pour ce client");
      return null;
    }
    
    console.log("✅ Ambassadeur trouvé:", data.ambassadors);
    return {
      id: data.ambassadors.id,
      name: data.ambassadors.name,
      email: data.ambassadors.email || '',
      commission_level_id: data.ambassadors.commission_level_id
    };
  } catch (error) {
    console.error("❌ Exception dans getClientAmbassador:", error);
    throw error;
  }
};

/**
 * Met à jour l'ambassadeur lié à un client
 */
export const updateClientAmbassador = async (
  clientId: string, 
  ambassadorId: string | null
) => {
  try {
    console.log("🔄 Mise à jour de l'ambassadeur pour le client:", { clientId, ambassadorId });
    
    // Supprimer tous les liens existants
    const { error: deleteError } = await supabase
      .from('ambassador_clients')
      .delete()
      .eq('client_id', clientId);
    
    if (deleteError) {
      console.error("❌ Erreur lors de la suppression du lien existant:", deleteError);
      throw deleteError;
    }
    
    // Si un nouvel ambassadeur est spécifié, créer le lien
    if (ambassadorId) {
      return await linkClientToAmbassador(clientId, ambassadorId);
    }
    
    console.log("✅ Ambassadeur retiré avec succès");
    return true;
  } catch (error) {
    console.error("❌ Exception dans updateClientAmbassador:", error);
    throw error;
  }
};
