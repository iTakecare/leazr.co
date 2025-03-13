
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/data/products";
import { toast } from "sonner";

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
}

export const createOffer = async (offerData: OfferData): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .insert([{
        ...offerData,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (error) {
    console.error('Error creating offer:', error);
    toast.error("Erreur lors de la création de l'offre");
    return null;
  }
};

export const getOffers = async () => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching offers:', error);
    toast.error("Erreur lors de la récupération des offres");
    return [];
  }
};

export const deleteOffer = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting offer:', error);
    toast.error("Erreur lors de la suppression de l'offre");
    return false;
  }
};
