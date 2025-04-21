
import { supabase } from "@/integrations/supabase/client";

const mockOffers = [
  {
    id: "1",
    client_name: "Entreprise ABC",
    amount: 25000,
    monthly_payment: 720,
    commission: 1250,
    status: "accepted",
    workflow_status: "client_approved",
    created_at: "2025-03-01T09:30:00Z",
    type: "admin_offer"
  },
  {
    id: "2",
    client_name: "Clinique Santé+",
    amount: 18500,
    monthly_payment: 540,
    commission: 925,
    status: "pending",
    workflow_status: "client_waiting",
    created_at: "2025-03-05T14:15:00Z",
    type: "admin_offer"
  },
  {
    id: "3",
    client_name: "Cabinet Dentaire Sourire",
    amount: 32000,
    monthly_payment: 910,
    commission: 1600,
    status: "rejected",
    workflow_status: "client_no_response",
    created_at: "2025-02-22T11:20:00Z",
    type: "admin_offer"
  },
  {
    id: "4",
    client_name: "Centre Imagerie Médicale",
    amount: 45000,
    monthly_payment: 1250,
    commission: 2250,
    status: "accepted",
    workflow_status: "leaser_approved",
    created_at: "2025-02-15T10:00:00Z",
    type: "admin_offer"
  }
];

export const getOffers = async (includeConverted: boolean = false): Promise<any[]> => {
  try {
    console.log("Récupération des offres en cours...");
    
    // Directement requêter sans timeout parallèle
    const { data, error } = await supabase
      .from('offers')
      .select('*, clients(name, email, company)')
      .eq('converted_to_contract', includeConverted ? true : false)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Erreur lors de la récupération des offres:", error);
      throw error;
    }
    
    console.log(`${data?.length || 0} offres récupérées avec succès`);
    
    // Retourner les données récupérées ou un tableau vide si pas de données
    return data || [];
  } catch (error) {
    console.error("Erreur lors de la récupération des offres:", error);
    console.log("IMPORTANT: Utilisation des données mockées en dernier recours");
    
    // N'utiliser les données mockées qu'en dernier recours
    const mockOffersWithType = mockOffers.map(offer => ({
      ...offer,
      type: 'admin_offer'
    }));
    return mockOffersWithType;
  }
};

export const getOffersByClientId = async (clientId: string): Promise<any[]> => {
  try {
    console.log("Fetching offers for client ID:", clientId);
    
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_id', clientId)
      .eq('converted_to_contract', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`Retrieved ${data?.length || 0} offers by client_id for client ${clientId}`);
    
    if (!data || data.length === 0) {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('name, email')
        .eq('id', clientId)
        .single();
        
      if (clientError || !clientData) {
        console.error("Error fetching client details:", clientError);
        return [];
      }
      
      console.log("Looking for offers by client name/email:", clientData.name, clientData.email);
      
      const { data: nameOffers, error: nameError } = await supabase
        .from('offers')
        .select('*')
        .ilike('client_name', clientData.name)
        .eq('converted_to_contract', false)
        .order('created_at', { ascending: false });
        
      if (nameError) {
        console.error("Error fetching offers by name:", nameError);
        return [];
      }
      
      console.log(`Found ${nameOffers?.length || 0} offers by client_name`);
      
      let emailOffers: any[] = [];
      if (clientData.email) {
        const { data: emailData, error: emailError } = await supabase
          .from('offers')
          .select('*')
          .ilike('client_email', clientData.email)
          .eq('converted_to_contract', false)
          .order('created_at', { ascending: false });
          
        if (emailError) {
          console.error("Error fetching offers by email:", emailError);
        } else {
          emailOffers = emailData || [];
          console.log(`Found ${emailOffers.length} offers by client_email`);
        }
      }
      
      const combinedOffers = [...(nameOffers || []), ...emailOffers];
      const uniqueOffers = combinedOffers.filter((offer, index, self) =>
        index === self.findIndex((o) => o.id === offer.id)
      );
      
      console.log(`Found ${uniqueOffers.length} unique offers in total`);
      
      for (const offer of uniqueOffers) {
        const { error: updateError } = await supabase
          .from('offers')
          .update({ client_id: clientId })
          .eq('id', offer.id);
          
        if (updateError) {
          console.error(`Error updating offer ${offer.id}:`, updateError);
        } else {
          console.log(`Updated client_id for offer ${offer.id}`);
        }
      }
      
      return uniqueOffers;
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching offers by client ID:", error);
    return [];
  }
};
