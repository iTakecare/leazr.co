
import { supabase } from "@/integrations/supabase/client";
import { Equipment } from "@/types/equipment";

// Données mockées pour avoir un affichage immédiat en cas de timeout
const mockOffers = [
  {
    id: "1",
    client_name: "Entreprise ABC",
    amount: 25000,
    monthly_payment: 720,
    commission: 1250,
    status: "accepted",
    created_at: "2025-03-01T09:30:00Z"
  },
  {
    id: "2",
    client_name: "Clinique Santé+",
    amount: 18500,
    monthly_payment: 540,
    commission: 925,
    status: "pending",
    created_at: "2025-03-05T14:15:00Z"
  },
  {
    id: "3",
    client_name: "Cabinet Dentaire Sourire",
    amount: 32000,
    monthly_payment: 910,
    commission: 1600,
    status: "rejected",
    created_at: "2025-02-22T11:20:00Z"
  },
  {
    id: "4",
    client_name: "Centre Imagerie Médicale",
    amount: 45000,
    monthly_payment: 1250,
    commission: 2250,
    status: "accepted",
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
  equipment_description: string;
  amount: number;
  coefficient: number;
  monthly_payment: number;
  commission: number;
  user_id: string; // User ID field required by the database
}

export const createOffer = async (offerData: OfferData): Promise<string | null> => {
  try {
    // Convert non-UUID string to a valid UUID for Supabase
    // This is a workaround for demo purposes - in production, you'd use real UUIDs from auth
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
    // Réduire le timeout à 5 secondes pour ne pas bloquer l'interface utilisateur
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => {
        console.log("Timeout atteint, utilisation des données mockées");
        reject(new Error("Timeout lors de la récupération des offres"));
      }, 5000)
    );
    
    const fetchPromise = supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Utiliser Promise.race pour résoudre avec la première promesse qui se termine
    const { data, error } = await Promise.race([
      fetchPromise,
      timeoutPromise,
    ]) as any;
    
    if (error) throw error;
    
    // Si aucune donnée n'est récupérée, renvoyer un tableau vide plutôt que null
    return data || [];
  } catch (error) {
    console.error("Error fetching offers:", error);
    // En cas d'erreur ou de timeout, retourner les données mockées
    return mockOffers;
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
