
import { supabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";

// Function to get all offers
export const getOffers = async (): Promise<OfferData[]> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching offers:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getOffers:", error);
    return [];
  }
};

// Function to get offers by specific client ID
export const getOffersByClientId = async (clientId: string): Promise<OfferData[]> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching client offers:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getOffersByClientId:", error);
    return [];
  }
};

// Function to get offers by client email
export const getOffersByClientEmail = async (clientEmail: string): Promise<OfferData[]> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_email', clientEmail)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching client offers by email:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getOffersByClientEmail:", error);
    return [];
  }
};

// Export additional offer-related functions
export * from './offerDetail';
