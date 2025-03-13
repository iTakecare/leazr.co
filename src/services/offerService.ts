
import { supabase } from "@/integrations/supabase/client";
import { Equipment } from "@/types/equipment";

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
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching offers:", error);
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
