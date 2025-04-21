
import { supabase, getAdminSupabaseClient } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Retrieves all offers with option to include or exclude converted offers
 */
export const getOffers = async (includeConverted: boolean = false): Promise<any[]> => {
  console.log(`Starting offer retrieval (includeConverted: ${includeConverted})`);
  
  try {
    // Try with standard client first
    console.log("Attempting with standard client...");
    const { data: userData } = await supabase.auth.getUser();
    console.log("Logged in user:", userData?.user?.id || "Not logged in");
    
    const { data, error } = await supabase
      .from('offers')
      .select('*');
    
    if (error) {
      console.error("Error with standard client:", error);
      throw error;
    }
    
    console.log(`${data?.length || 0} offers retrieved with standard client`);
    
    // Filter offers if needed
    const filteredData = includeConverted 
      ? data 
      : data?.filter(offer => !offer.converted_to_contract);
    
    return filteredData || [];
  } catch (standardClientError) {
    console.error("Failed with standard client, trying admin client...", standardClientError);
    
    try {
      // Try with admin client
      const adminClient = getAdminSupabaseClient();
      
      const { data, error } = await adminClient
        .from('offers')
        .select('*');
      
      if (error) {
        console.error("Error with admin client:", error);
        throw error;
      }
      
      console.log(`${data?.length || 0} offers retrieved with admin client`);
      
      // Filter offers if needed
      const filteredData = includeConverted 
        ? data 
        : data?.filter(offer => !offer.converted_to_contract);
      
      return filteredData || [];
    } catch (adminClientError) {
      console.error("Fatal error with both clients:", adminClientError);
      
      // Return empty array to avoid errors
      return [];
    }
  }
};

/**
 * Retrieves offers by client ID
 */
export const getOffersByClientId = async (clientId: string): Promise<any[]> => {
  try {
    console.log("Retrieving offers for client ID:", clientId);
    
    // Try with standard client
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('client_id', clientId)
      .eq('converted_to_contract', false);
    
    if (error) {
      console.error("Error with standard client:", error);
      throw error;
    }
    
    return data || [];
  } catch (standardClientError) {
    console.error("Trying with admin client...", standardClientError);
    
    try {
      // Try with admin client
      const adminClient = getAdminSupabaseClient();
      const { data, error } = await adminClient
        .from('offers')
        .select('*')
        .eq('client_id', clientId)
        .eq('converted_to_contract', false);
      
      if (error) {
        console.error("Error with admin client:", error);
        throw error;
      }
      
      return data || [];
    } catch (adminClientError) {
      console.error("Fatal error with both clients:", adminClientError);
      return [];
    }
  }
};
