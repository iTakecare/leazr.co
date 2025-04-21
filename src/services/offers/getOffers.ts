
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OfferData } from "./types";

export const getOffers = async (includeConverted: boolean = false): Promise<any[]> => {
  try {
    console.log("Fetching offers with includeConverted:", includeConverted);
    
    // Get current authenticated user
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("Authentication error:", authError);
      return [];
    }
    
    console.log("Current user ID:", authData.user?.id);
    
    // Construction de la requête de base
    let query = supabase
      .from('offers')
      .select('*, clients(name, email, company)');
    
    // Appliquer le filtre uniquement si includeConverted est false
    if (!includeConverted) {
      query = query.eq('converted_to_contract', false);
    }
    
    // Trier par date de création (les plus récentes en premier)
    query = query.order('created_at', { ascending: false });
    
    console.log("Query built, fetching data...");
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching offers:", error);
      throw error;
    }
    
    // Comprehensive debug logging
    if (!data || data.length === 0) {
      console.log("No offers found in database");
      
      // Debug: Check if offers table has any records at all
      const { count, error: countError } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error("Error counting offers:", countError);
      } else {
        console.log(`Total offers in database: ${count}`);
      }
    } else {
      console.log(`Retrieved ${data.length} offers from database:`, data);
    }
    
    return data || [];
  } catch (error) {
    console.error("Complete error when fetching offers:", error);
    toast.error("Error loading offers.");
    return [];
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
