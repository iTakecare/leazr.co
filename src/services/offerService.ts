
import { supabase } from "@/integrations/supabase/client";
import { Equipment } from "@/types/equipment";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { createContractFromOffer } from "./contractService";

const mockOffers = [
  {
    id: "1",
    client_name: "Entreprise ABC",
    amount: 25000,
    monthly_payment: 720,
    commission: 1250,
    status: "accepted",
    workflow_status: "client_approved",
    created_at: "2025-03-01T09:30:00Z"
  },
  {
    id: "2",
    client_name: "Clinique Santé+",
    amount: 18500,
    monthly_payment: 540,
    commission: 925,
    status: "pending",
    workflow_status: "client_waiting",
    created_at: "2025-03-05T14:15:00Z"
  },
  {
    id: "3",
    client_name: "Cabinet Dentaire Sourire",
    amount: 32000,
    monthly_payment: 910,
    commission: 1600,
    status: "rejected",
    workflow_status: "client_no_response",
    created_at: "2025-02-22T11:20:00Z"
  },
  {
    id: "4",
    client_name: "Centre Imagerie Médicale",
    amount: 45000,
    monthly_payment: 1250,
    commission: 2250,
    status: "accepted",
    workflow_status: "leaser_approved",
    created_at: "2025-02-15T10:00:00Z"
  }
];

export interface EquipmentItem {
  id: string;
  title: string;
  purchasePrice: number;
  quantity: number;
  margin: number;
}

export interface OfferData {
  client_name: string;
  client_email: string;
  client_id?: string;
  equipment_description: string;
  amount: number;
  coefficient: number;
  monthly_payment: number;
  commission: number;
  user_id: string;
}

export const createOffer = async (offerData: OfferData): Promise<string | null> => {
  try {
    const validData = {
      ...offerData,
      user_id: offerData.user_id === 'user-123' ? 
        '00000000-0000-0000-0000-000000000000' : offerData.user_id
    };
    
    const { data, error } = await supabase
      .from('offers')
      .insert(validData)
      .select();
    
    if (error) throw error;
    
    return data?.[0]?.id || null;
  } catch (error) {
    console.error("Error creating offer:", error);
    return null;
  }
};

export const getOffers = async (): Promise<any[]> => {
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        console.log("Timeout atteint, utilisation des données mockées");
        reject(new Error("Timeout lors de la récupération des offres"));
      }, 5000)
    );
    
    const fetchPromise = supabase
      .from('offers')
      .select('*, clients(name, email, company)')
      .eq('converted_to_contract', false)
      .order('created_at', { ascending: false });
    
    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]) as any;
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching offers:", error);
    return mockOffers;
  }
};

export const getOffersByClientId = async (clientId: string): Promise<any[]> => {
  try {
    console.log("Fetching offers for client ID:", clientId);
    
    // Récupérer les offres par client_id
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_id', clientId)
      .eq('converted_to_contract', false)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    console.log(`Retrieved ${data?.length || 0} offers by client_id for client ${clientId}`);
    
    // Si aucune offre n'est trouvée avec client_id, essayer avec client_name et client_email
    if (!data || data.length === 0) {
      // Récupérer le nom et l'email du client
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
      
      // Rechercher les offres par nom de client (insensible à la casse)
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
      
      // Rechercher aussi par email client si disponible
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
      
      // Combiner tous les résultats et supprimer les doublons
      const combinedOffers = [...(nameOffers || []), ...emailOffers];
      const uniqueOffers = combinedOffers.filter((offer, index, self) =>
        index === self.findIndex((o) => o.id === offer.id)
      );
      
      console.log(`Found ${uniqueOffers.length} unique offers in total`);
      
      // Mettre à jour client_id pour ces offres
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
    toast.error("Erreur lors de la récupération des offres du client");
    return [];
  }
};

export const deleteOffer = async (offerId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', offerId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error deleting offer:", error);
    return false;
  }
};

export const updateOfferStatus = async (
  offerId: string, 
  newStatus: string, 
  previousStatus: string,
  reason?: string
): Promise<boolean> => {
  try {
    console.log(`Updating offer ${offerId} from ${previousStatus} to ${newStatus} with reason: ${reason || 'Aucune'}`);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error("Utilisateur non authentifié");
    }

    const { error: logError } = await supabase
      .from('offer_workflow_logs')
      .insert({
        offer_id: offerId,
        user_id: user.id,
        previous_status: previousStatus,
        new_status: newStatus,
        reason: reason || null
      });

    if (logError) {
      console.error("Erreur lors de l'enregistrement du log :", logError);
    }

    if (newStatus === 'leaser_approved') {
      try {
        const leaserName = "Grenke";
        const leaserLogo = "https://logo.clearbit.com/grenke.com";
        
        const contractId = await createContractFromOffer(offerId, leaserName, leaserLogo);
        
        if (contractId) {
          toast.success("L'offre a été convertie en contrat");
          console.log("Contrat créé avec l'ID:", contractId);
        }
      } catch (contractError) {
        console.error("Erreur lors de la création du contrat:", contractError);
        toast.error("L'offre a été approuvée mais nous n'avons pas pu créer le contrat");
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));
    
    return true;
  } catch (error) {
    console.error("Error updating offer status:", error);
    return false;
  }
};

export const getWorkflowLogs = async (offerId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('offer_workflow_logs')
      .select(`
        *,
        profiles:user_id (first_name, last_name, email, avatar_url)
      `)
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching workflow logs:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching workflow logs:", error);
    return [];
  }
};
