import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Get the client ID associated with a user
 */
export const getClientIdForUser = async (userId: string): Promise<string | null> => {
  try {
    console.log("Looking up client for user ID:", userId);
    
    // First, try to find a client with this user_id
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .single();
      
    if (clientError) {
      console.error("Error querying client by user_id:", clientError);
      // Fall through to next method
    } else if (clientData) {
      console.log("Found client by user_id:", clientData.id);
      return clientData.id;
    }
    
    // If no client found with that user_id, we need to get the user's email
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error("Error fetching user data:", userError);
      return null;
    }
    
    const userEmail = userData?.user?.email;
    
    if (!userEmail) {
      console.error("No email found for user");
      return null;
    }
    
    // Now try to find a client with that email
    const { data: emailClientData, error: emailClientError } = await supabase
      .from('clients')
      .select('id')
      .eq('email', userEmail)
      .single();
      
    if (emailClientError) {
      console.error("Error querying client by email:", emailClientError);
      return null;
    }
    
    if (emailClientData) {
      console.log("Found client by email:", emailClientData.id);
      
      // Update the client record with the user_id for next time
      const { error: updateError } = await supabase
        .from('clients')
        .update({ user_id: userId })
        .eq('id', emailClientData.id);
        
      if (updateError) {
        console.error("Failed to update client with user_id:", updateError);
      }
      
      return emailClientData.id;
    }
    
    console.error("No matching client found for this user");
    return null;
  } catch (error) {
    console.error("Error in getClientIdForUser:", error);
    return null;
  }
};

/**
 * Link a user to a client
 */
export const linkUserToClient = async (userId: string, clientId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('clients')
      .update({ 
        user_id: userId,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', clientId);
      
    if (error) {
      console.error("Error linking user to client:", error);
      toast.error("Erreur lors de l'association de l'utilisateur au client");
      return false;
    }
    
    toast.success("Utilisateur associé au client avec succès");
    return true;
  } catch (error) {
    console.error("Error in linkUserToClient:", error);
    toast.error("Erreur lors de l'association de l'utilisateur au client");
    return false;
  }
};

/**
 * Clean up duplicate clients
 */
export const cleanupDuplicateClients = async (): Promise<{ 
  processedCount: number, 
  mergedCount: number 
}> => {
  try {
    // 1. Get all clients
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error("Error fetching clients:", error);
      throw new Error("Failed to fetch clients");
    }
    
    // Initialize results
    const result = {
      processedCount: 0,
      mergedCount: 0
    };
    
    if (!clients || clients.length === 0) {
      return result;
    }
    
    // 2. Group clients by email (where email exists)
    const clientsByEmail: Record<string, any[]> = {};
    
    clients.forEach(client => {
      if (client.email) {
        const email = client.email.toLowerCase().trim();
        if (!clientsByEmail[email]) {
          clientsByEmail[email] = [];
        }
        clientsByEmail[email].push(client);
      }
    });
    
    // 3. Process each group of clients with the same email
    for (const [email, emailClients] of Object.entries(clientsByEmail)) {
      result.processedCount++;
      
      if (emailClients.length <= 1) {
        continue; // No duplicates for this email
      }
      
      // If multiple clients with the same email, keep the oldest one
      const primaryClient = emailClients[0]; // The earliest created one
      const duplicateClients = emailClients.slice(1);
      
      // Process each duplicate
      for (const duplicate of duplicateClients) {
        // Update offers to point to the primary client
        const { error: offersError } = await supabase
          .from('offers')
          .update({ client_id: primaryClient.id })
          .eq('client_id', duplicate.id);
          
        if (offersError) {
          console.error(`Error updating offers for client ${duplicate.id}:`, offersError);
          continue;
        }
        
        // Update contracts to point to the primary client
        const { error: contractsError } = await supabase
          .from('contracts')
          .update({ client_id: primaryClient.id })
          .eq('client_id', duplicate.id);
          
        if (contractsError) {
          console.error(`Error updating contracts for client ${duplicate.id}:`, contractsError);
          continue;
        }
        
        // Delete the duplicate client
        const { error: deleteError } = await supabase
          .from('clients')
          .delete()
          .eq('id', duplicate.id);
          
        if (deleteError) {
          console.error(`Error deleting duplicate client ${duplicate.id}:`, deleteError);
          continue;
        }
        
        result.mergedCount++;
      }
    }
    
    return result;
  } catch (error) {
    console.error("Error in cleanupDuplicateClients:", error);
    throw error;
  }
};
