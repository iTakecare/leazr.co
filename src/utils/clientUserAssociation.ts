
import { supabase } from "@/integrations/supabase/client";

export const associateClientWithAmbassador = async (clientId: string, ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from('ambassador_clients')
      .insert([
        { client_id: clientId, ambassador_id: ambassadorId }
      ]);

    if (error) {
      console.error("Error associating client with ambassador:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error associating client with ambassador:", error);
    return false;
  }
};

export const disassociateClientWithAmbassador = async (clientId: string, ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from('ambassador_clients')
      .delete()
      .eq('client_id', clientId)
      .eq('ambassador_id', ambassadorId);

    if (error) {
      console.error("Error disassociating client with ambassador:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error disassociating client with ambassador:", error);
    return false;
  }
};

export const getClientsByAmbassador = async (ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from('ambassador_clients')
      .select('client_id')
      .eq('ambassador_id', ambassadorId);

    if (error) {
      console.error("Error fetching clients by ambassador:", error);
      return [];
    }

    return data ? data.map(item => item.client_id) : [];
  } catch (error) {
    console.error("Error fetching clients by ambassador:", error);
    return [];
  }
};

export const getAmbassadorsByClient = async (clientId: string) => {
  try {
    const { data, error } = await supabase
      .from('ambassador_clients')
      .select('ambassador_id')
      .eq('client_id', clientId);

    if (error) {
      console.error("Error fetching ambassadors by client:", error);
      return [];
    }

    return data ? data.map(item => item.ambassador_id) : [];
  } catch (error) {
    console.error("Error fetching ambassadors by client:", error);
    return [];
  }
};

export const getAllClientAmbassadorAssociations = async () => {
  try {
    const { data: ambassadorClients, error: ambassadorError } = await supabase
      .from('ambassador_clients')
      .select('ambassador_id, client_id');

    // Then manually group the data
    const groupedByAmbassador: Record<string, string[]> = {};
    if (ambassadorClients) {
      ambassadorClients.forEach(relation => {
        if (!groupedByAmbassador[relation.ambassador_id]) {
          groupedByAmbassador[relation.ambassador_id] = [];
        }
        groupedByAmbassador[relation.ambassador_id].push(relation.client_id);
      });
    }

    return groupedByAmbassador;
  } catch (error) {
    console.error("Error fetching all client ambassador associations:", error);
    return {};
  }
};

// Added missing functions:

// Function to link a user to a client by email
export const linkUserToClient = async (userId: string, userEmail: string): Promise<string | null> => {
  try {
    console.log(`Attempting to link user ${userId} with email ${userEmail} to a client`);
    
    // First check if there's a client with the same email that's not yet linked to a user
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name, email')
      .eq('email', userEmail)
      .is('user_id', null)
      .maybeSingle();
    
    if (clientError) {
      console.error("Error checking for matching client:", clientError);
      return null;
    }
    
    if (clientData) {
      console.log(`Found matching client: ${clientData.id} (${clientData.name})`);
      
      // Update the client with the user ID
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          user_id: userId,
          has_user_account: true,
          user_account_created_at: new Date().toISOString()
        })
        .eq('id', clientData.id);
      
      if (updateError) {
        console.error("Error linking user to client:", updateError);
        return null;
      }
      
      console.log(`Successfully linked user ${userId} to client ${clientData.id}`);
      return clientData.id;
    }
    
    // If no match by email is found, check by case-insensitive email
    const { data: fuzzyClientData, error: fuzzyError } = await supabase
      .from('clients')
      .select('id, name, email')
      .ilike('email', userEmail)
      .is('user_id', null)
      .maybeSingle();
    
    if (fuzzyError) {
      console.error("Error checking for fuzzy matching client:", fuzzyError);
      return null;
    }
    
    if (fuzzyClientData) {
      console.log(`Found fuzzy matching client: ${fuzzyClientData.id} (${fuzzyClientData.name})`);
      
      // Update the client with the user ID
      const { error: updateError } = await supabase
        .from('clients')
        .update({ 
          user_id: userId,
          has_user_account: true,
          user_account_created_at: new Date().toISOString()
        })
        .eq('id', fuzzyClientData.id);
      
      if (updateError) {
        console.error("Error linking user to client:", updateError);
        return null;
      }
      
      console.log(`Successfully linked user ${userId} to client ${fuzzyClientData.id}`);
      return fuzzyClientData.id;
    }
    
    console.log(`No matching client found for user ${userId} with email ${userEmail}`);
    return null;
  } catch (error) {
    console.error("Error in linkUserToClient:", error);
    return null;
  }
};

// Function to retrieve the client ID for a given user ID
export const getClientIdForUser = async (userId: string): Promise<string | null> => {
  try {
    // Check local storage first for performance
    const cachedClientId = localStorage.getItem(`client_id_${userId}`);
    if (cachedClientId) {
      console.log(`Retrieved client ID from cache: ${cachedClientId}`);
      return cachedClientId;
    }
    
    // Fetch from database if not in cache
    const { data, error } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();
    
    if (error) {
      console.error("Error fetching client ID for user:", error);
      return null;
    }
    
    if (data && data.id) {
      // Cache the result for future use
      localStorage.setItem(`client_id_${userId}`, data.id);
      console.log(`Retrieved client ID from database: ${data.id}`);
      return data.id;
    }
    
    console.log(`No client found for user ${userId}`);
    return null;
  } catch (error) {
    console.error("Error in getClientIdForUser:", error);
    return null;
  }
};

// Function to clean up duplicate client associations
export const cleanupDuplicateClients = async (): Promise<boolean> => {
  try {
    console.log("Starting client cleanup process");
    
    // Get all clients
    const { data: clients, error: clientError } = await supabase
      .from('clients')
      .select('id, email, name, created_at')
      .order('created_at', { ascending: true });
    
    if (clientError) {
      console.error("Error fetching clients for cleanup:", clientError);
      return false;
    }
    
    // Group clients by email
    const clientsByEmail: Record<string, any[]> = {};
    
    clients?.forEach(client => {
      if (!client.email) return;
      
      const email = client.email.toLowerCase().trim();
      if (!clientsByEmail[email]) {
        clientsByEmail[email] = [];
      }
      clientsByEmail[email].push(client);
    });
    
    // Find duplicates (more than one client with the same email)
    const duplicateEmails = Object.keys(clientsByEmail).filter(
      email => clientsByEmail[email].length > 1
    );
    
    console.log(`Found ${duplicateEmails.length} emails with duplicate clients`);
    
    // Process each set of duplicates
    for (const email of duplicateEmails) {
      const dupes = clientsByEmail[email];
      const primaryClient = dupes[0]; // Keep the oldest one (first in array as we sorted by created_at)
      const duplicateClients = dupes.slice(1);
      
      console.log(`Processing duplicates for ${email}: keeping ${primaryClient.id}, merging ${duplicateClients.length} duplicates`);
      
      // For each duplicate, migrate its associations to the primary client
      for (const dupe of duplicateClients) {
        // Migrate ambassador associations
        const { data: ambassadorAssociations, error: assocError } = await supabase
          .from('ambassador_clients')
          .select('ambassador_id')
          .eq('client_id', dupe.id);
        
        if (assocError) {
          console.error(`Error fetching ambassador associations for client ${dupe.id}:`, assocError);
          continue;
        }
        
        for (const assoc of ambassadorAssociations || []) {
          // Check if this association already exists for the primary client
          const { count, error: countError } = await supabase
            .from('ambassador_clients')
            .select('*', { count: 'exact', head: true })
            .eq('ambassador_id', assoc.ambassador_id)
            .eq('client_id', primaryClient.id);
          
          if (countError) {
            console.error(`Error checking existing association:`, countError);
            continue;
          }
          
          // Only create the association if it doesn't already exist
          if (count === 0) {
            const { error: insertError } = await supabase
              .from('ambassador_clients')
              .insert({
                ambassador_id: assoc.ambassador_id,
                client_id: primaryClient.id
              });
            
            if (insertError) {
              console.error(`Error migrating ambassador association:`, insertError);
            } else {
              console.log(`Migrated ambassador ${assoc.ambassador_id} association from ${dupe.id} to ${primaryClient.id}`);
            }
          }
        }
        
        // Migrate partner associations
        const { data: partnerAssociations, error: partnerError } = await supabase
          .from('partner_clients')
          .select('partner_id')
          .eq('client_id', dupe.id);
        
        if (partnerError) {
          console.error(`Error fetching partner associations for client ${dupe.id}:`, partnerError);
          continue;
        }
        
        for (const assoc of partnerAssociations || []) {
          // Check if this association already exists for the primary client
          const { count, error: countError } = await supabase
            .from('partner_clients')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', assoc.partner_id)
            .eq('client_id', primaryClient.id);
          
          if (countError) {
            console.error(`Error checking existing partner association:`, countError);
            continue;
          }
          
          // Only create the association if it doesn't already exist
          if (count === 0) {
            const { error: insertError } = await supabase
              .from('partner_clients')
              .insert({
                partner_id: assoc.partner_id,
                client_id: primaryClient.id
              });
            
            if (insertError) {
              console.error(`Error migrating partner association:`, insertError);
            } else {
              console.log(`Migrated partner ${assoc.partner_id} association from ${dupe.id} to ${primaryClient.id}`);
            }
          }
        }
        
        // Update offers to point to the primary client
        const { error: offerError } = await supabase
          .from('offers')
          .update({ client_id: primaryClient.id })
          .eq('client_id', dupe.id);
        
        if (offerError) {
          console.error(`Error updating offers for client ${dupe.id}:`, offerError);
        } else {
          console.log(`Updated offers from client ${dupe.id} to ${primaryClient.id}`);
        }
        
        // Update contracts to point to the primary client
        const { error: contractError } = await supabase
          .from('contracts')
          .update({ client_id: primaryClient.id })
          .eq('client_id', dupe.id);
        
        if (contractError) {
          console.error(`Error updating contracts for client ${dupe.id}:`, contractError);
        } else {
          console.log(`Updated contracts from client ${dupe.id} to ${primaryClient.id}`);
        }
        
        // Mark the duplicate as inactive rather than deleting
        const { error: updateError } = await supabase
          .from('clients')
          .update({ 
            status: 'inactive',
            notes: `Merged into client ${primaryClient.id} during cleanup`
          })
          .eq('id', dupe.id);
        
        if (updateError) {
          console.error(`Error marking client ${dupe.id} as inactive:`, updateError);
        } else {
          console.log(`Marked client ${dupe.id} as inactive`);
        }
      }
    }
    
    console.log("Client cleanup completed successfully");
    return true;
  } catch (error) {
    console.error("Error in cleanupDuplicateClients:", error);
    return false;
  }
};
