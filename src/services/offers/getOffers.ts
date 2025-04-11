
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
    
    // 1. Première tentative: recherche par client_id
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
      
    if (clientError || !clientData) {
      console.error("Erreur lors de la récupération des détails du client:", clientError);
      return [];
    }
    
    console.log("Recherche d'offres par nom/email du client:", clientData.name, clientData.email);
    
    // 3. Recherche par nom du client (insensible à la casse)
    const { data: nameOffers, error: nameError } = await supabase
      .from('offers')
      .select('*, clients(name, email, company)')
      .ilike('client_name', clientData.name)
      .order('created_at', { ascending: false });
      
    if (nameError) {
      console.error("Erreur lors de la recherche des offres par nom:", nameError);
      return [];
    }
    
    console.log(`Trouvé ${nameOffers?.length || 0} offres par client_name`);
    
    // 4. Recherche par email du client si disponible
    let emailOffers: any[] = [];
    if (clientData.email) {
      const { data: emailData, error: emailError } = await supabase
        .from('offers')
        .select('*, clients(name, email, company)')
        .ilike('client_email', clientData.email)
        .order('created_at', { ascending: false });
        
      if (emailError) {
        console.error("Erreur lors de la recherche des offres par email:", emailError);
      } else {
        emailOffers = emailData || [];
        console.log(`Trouvé ${emailOffers.length} offres par client_email`);
      }
    }
    
    // 5. Combiner et dédupliquer les résultats
    const combinedOffers = [...(nameOffers || []), ...emailOffers];
    const uniqueOffers = combinedOffers.filter((offer, index, self) =>
      index === self.findIndex((o) => o.id === offer.id)
    );
    
    console.log(`Trouvé ${uniqueOffers.length} offres uniques au total`);
    
    // 6. Mettre à jour les offres avec le client_id correct
    for (const offer of uniqueOffers) {
      const { error: updateError } = await supabase
        .from('offers')
        .update({ client_id: clientId })
        .eq('id', offer.id);
        
      if (updateError) {
        console.error(`Erreur lors de la mise à jour de l'offre ${offer.id}:`, updateError);
      } else {
        console.log(`Mise à jour du client_id pour l'offre ${offer.id}`);
      }
    }
    
    return uniqueOffers;
  } catch (error) {
    console.error("Erreur lors de la récupération des offres par client ID:", error);
    return [];
  }
};
