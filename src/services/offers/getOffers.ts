
import { supabase } from "@/integrations/supabase/client";

// Note: cette fonction est conservée pour compatibilité mais n'est plus utilisée directement
export const getOffers = async (includeConverted: boolean = false): Promise<any[]> => {
  try {
    console.log("Récupération des offres (includeConverted:", includeConverted, ")");
    
    const { data, error } = await supabase
      .from('offers')
      .select('*, clients(name, email, company)')
      .eq('converted_to_contract', includeConverted)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Erreur lors de la récupération des offres:", error);
      throw error;
    }
    
    console.log(`Récupération réussie: ${data?.length || 0} offres trouvées`);
    return data || [];
  } catch (error) {
    console.error("Erreur dans getOffers:", error);
    throw error;
  }
};

export const getOffersByClientId = async (clientId: string): Promise<any[]> => {
  try {
    console.log("Fetching offers for client ID:", clientId);
    
    // 1. Première tentative: recherche directe par client_id
    const { data, error } = await supabase
      .from('offers')
      .select('*, clients(name, email, company)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Erreur lors de la récupération des offres par client_id:", error);
      throw error;
    }
    
    console.log(`Récupéré ${data?.length || 0} offres par client_id pour client ${clientId}`);
    
    if (data && data.length > 0) {
      return data;
    }
    
    // 2. Si aucune offre trouvée, récupérer les informations du client
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('name, email, company')
      .eq('id', clientId)
      .single();
      
    if (clientError) {
      console.error("Erreur lors de la récupération des détails du client:", clientError);
      console.log("Client introuvable avec l'ID:", clientId);
      return [];
    }
    
    if (!clientData) {
      console.error("Aucune donnée client trouvée pour l'ID:", clientId);
      return [];
    }
    
    console.log("Recherche d'offres par informations du client:", clientData);
    
    // Création d'un tableau pour stocker toutes les offres trouvées
    let allOffers: any[] = [];
    
    // 3. Recherche par nom du client (insensible à la casse)
    if (clientData.name) {
      const { data: nameOffers, error: nameError } = await supabase
        .from('offers')
        .select('*, clients(name, email, company)')
        .ilike('client_name', `%${clientData.name}%`)
        .order('created_at', { ascending: false });
        
      if (!nameError && nameOffers && nameOffers.length > 0) {
        console.log(`Trouvé ${nameOffers.length} offres par client_name`);
        allOffers = [...allOffers, ...nameOffers];
      }
    }
    
    // 4. Recherche par email du client si disponible
    if (clientData.email) {
      const { data: emailOffers, error: emailError } = await supabase
        .from('offers')
        .select('*, clients(name, email, company)')
        .ilike('client_email', `%${clientData.email}%`)
        .order('created_at', { ascending: false });
        
      if (!emailError && emailOffers && emailOffers.length > 0) {
        console.log(`Trouvé ${emailOffers.length} offres par client_email`);
        allOffers = [...allOffers, ...emailOffers];
      }
    }
    
    // 5. Dédupliquer les résultats par ID d'offre
    const uniqueOffers = Array.from(
      new Map(allOffers.map(offer => [offer.id, offer])).values()
    );
    
    console.log(`Trouvé ${uniqueOffers.length} offres uniques au total pour le client ${clientId}`);
    
    // 6. Mettre à jour les offres avec le client_id correct si nécessaire
    for (const offer of uniqueOffers) {
      if (offer.client_id !== clientId) {
        console.log(`Mise à jour du client_id pour l'offre ${offer.id}`);
        
        const { error: updateError } = await supabase
          .from('offers')
          .update({ client_id: clientId })
          .eq('id', offer.id);
          
        if (updateError) {
          console.error(`Erreur lors de la mise à jour de l'offre ${offer.id}:`, updateError);
        } else {
          console.log(`Client_id mis à jour pour l'offre ${offer.id}`);
          offer.client_id = clientId; // Mettre à jour l'objet local également
        }
      }
    }
    
    return uniqueOffers;
  } catch (error) {
    console.error("Erreur lors de la récupération des offres par client ID:", error);
    return [];
  }
};
