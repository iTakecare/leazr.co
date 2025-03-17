
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Type definition for Offer
export interface Offer {
  id: string;
  clientId: string;
  client_name: string;
  client_email: string;
  leaser_id: string;
  amount: number;
  coefficient: number;
  equipment_description: string;
  equipment_text: string;
  monthly_payment: number;
  commission: number;
  additional_info: string;
  user_id: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'signed';
  created_at: string;
  updated_at: string;
  type?: string; // Optional field for compatibility
  workflow_status?: string; // Optional field for compatibility
  converted_to_contract?: boolean; // Optional field for compatibility
}

// Create a new offer using Supabase
export const createOffer = async (offerData: Omit<Offer, 'id' | 'status' | 'created_at' | 'updated_at'>): Promise<Offer> => {
  try {
    const newOffer = {
      ...offerData,
      status: 'draft' as const,
    };
    
    const { data, error } = await supabase
      .from('offers')
      .insert(newOffer)
      .select()
      .single();
    
    if (error) throw error;
    
    return data as Offer;
  } catch (error) {
    console.error('Error creating offer:', error);
    toast.error("Erreur lors de la création de l'offre");
    throw error;
  }
};

// Get all offers
export const getOffers = async (): Promise<Offer[]> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*');
    
    if (error) throw error;
    
    return data as Offer[];
  } catch (error) {
    console.error('Error fetching offers:', error);
    toast.error("Erreur lors de la récupération des offres");
    throw error;
  }
};

// Get offer by ID
export const getOfferById = async (id: string): Promise<Offer | null> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    
    if (error) throw error;
    
    return data as Offer;
  } catch (error) {
    console.error('Error fetching offer by ID:', error);
    toast.error("Erreur lors de la récupération de l'offre");
    throw error;
  }
};

// Update offer status
export const updateOfferStatus = async (id: string, status: Offer['status']): Promise<Offer | null> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data as Offer;
  } catch (error) {
    console.error('Error updating offer status:', error);
    toast.error("Erreur lors de la mise à jour du statut de l'offre");
    throw error;
  }
};

// Delete offer
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

// Send information request
export const sendInfoRequest = async (offerId: string, message: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('info_requests')
      .insert({
        offer_id: offerId,
        message,
        status: 'pending'
      });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error sending info request:', error);
    toast.error("Erreur lors de l'envoi de la demande d'information");
    return false;
  }
};

// Process information response
export const processInfoResponse = async (offerId: string, response: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('info_responses')
      .insert({
        offer_id: offerId,
        response,
        processed_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error processing info response:', error);
    toast.error("Erreur lors du traitement de la réponse");
    return false;
  }
};

// Get workflow logs
export const getWorkflowLogs = async (offerId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('workflow_logs')
      .select('*')
      .eq('offer_id', offerId)
      .order('timestamp', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error fetching workflow logs:', error);
    toast.error("Erreur lors de la récupération des logs de workflow");
    return [];
  }
};
