
import { supabase } from "@/integrations/supabase/client";
import { Client } from "@/types/client";

export interface Ambassador {
  id: string;
  name: string;
  email: string;
  phone?: string;
  region?: string;
  status: string;
  created_at: string;
  clients_count: number;
  commissions_total: number;
  last_commission: number;
  company_id: string;
}

export const getAmbassadorById = async (id: string): Promise<Ambassador | null> => {
  try {
    const { data, error } = await supabase
      .from('ambassadors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ambassador:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getAmbassadorById:', error);
    return null;
  }
};

export const getAmbassadorStats = async (ambassadorId: string) => {
  try {
    // Utiliser la fonction sécurisée pour récupérer les clients
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const { data: clientsData, error: clientsError } = await supabase
      .rpc('get_ambassador_clients_secure', { p_user_id: user.id });

    if (clientsError) {
      console.error('Erreur lors du chargement des clients:', clientsError);
      throw clientsError;
    }

    const clientsCount = clientsData?.length || 0;
    console.log(`Trouvé ${clientsCount} clients pour l'ambassadeur ${ambassadorId}`);

    // Récupérer les commissions de l'ambassadeur
    const { data: commissions, error: commissionError } = await supabase
      .from('offers')
      .select('commission')
      .eq('ambassador_id', ambassadorId)
      .not('commission', 'is', null);

    if (commissionError) {
      console.error('Error fetching commissions:', commissionError);
    }

    const totalCommissions = commissions?.reduce((sum, offer) => sum + (offer.commission || 0), 0) || 0;
    const lastCommissionAmount = commissions && commissions.length > 0 ? commissions[commissions.length - 1].commission || 0 : 0;

    return {
      clientsCount,
      totalCommissions,
      lastCommissionAmount
    };
  } catch (error) {
    console.error('Error in getAmbassadorStats:', error);
    return {
      clientsCount: 0,
      totalCommissions: 0,
      lastCommissionAmount: 0
    };
  }
};

export const getAmbassadorClients = async (ambassadorId: string): Promise<Client[]> => {
  try {
    console.log(`Chargement des clients pour l'ambassadeur: ${ambassadorId}`);
    
    // Utiliser la fonction sécurisée
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const { data: clientsData, error } = await supabase
      .rpc('get_ambassador_clients_secure', { p_user_id: user.id });

    if (error) {
      console.error('Erreur lors du chargement des clients:', error);
      throw error;
    }

    if (!clientsData || clientsData.length === 0) {
      console.log(`Aucun client trouvé pour l'ambassadeur ${ambassadorId}`);
      return [];
    }

    // Transformer les données de la fonction en format Client
    const processedClients: Client[] = clientsData.map(row => ({
      id: row.client_id,
      name: row.client_name,
      email: row.client_email,
      company: row.client_company,
      phone: row.client_phone,
      address: row.client_address,
      city: row.client_city,
      postal_code: row.client_postal_code,
      country: row.client_country,
      vat_number: row.client_vat_number,
      notes: row.client_notes,
      status: row.client_status as any,
      created_at: row.client_created_at,
      updated_at: row.client_updated_at,
      user_id: row.client_user_id,
      has_user_account: row.client_has_user_account,
      company_id: row.client_company_id,
      is_ambassador_client: true,
      createdAt: row.link_created_at ? new Date(row.link_created_at).toISOString() : undefined
    }));

    console.log(`Clients traités: ${processedClients.length}`);
    return processedClients;
  } catch (error) {
    console.error('Erreur fatale dans getAmbassadorClients:', error);
    throw error;
  }
};
