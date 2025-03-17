
import { supabase } from "@/integrations/supabase/client";

// Get client ID for a specific user directly from the database
export const getClientIdForUser = async (userId: string, email: string | null): Promise<string | null> => {
  try {
    console.log(`Looking up client for user ID: ${userId}, email: ${email || 'N/A'}`);
    
    // First, try to find by user_id
    const { data: clientByUserId, error: userIdError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (userIdError) throw userIdError;
    
    if (clientByUserId) {
      return clientByUserId.id;
    }
    
    // If not found by user_id and we have an email, try by email
    if (email) {
      const { data: clientByEmail, error: emailError } = await supabase
        .from('clients')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (emailError) throw emailError;
      
      if (clientByEmail) {
        // Update the client with the user_id since we found it by email
        const { error: updateError } = await supabase
          .from('clients')
          .update({ user_id: userId })
          .eq('id', clientByEmail.id);
        
        if (updateError) {
          console.error("Error updating client with user ID:", updateError);
        }
        
        return clientByEmail.id;
      }
    }
    
    // No client found
    return null;
  } catch (error) {
    console.error("Error in getClientIdForUser:", error);
    return null;
  }
};

// Link a user to a client
export const linkUserToClient = async (userId: string, clientId: string): Promise<boolean> => {
  try {
    console.log(`Linking user ${userId} to client ${clientId}`);
    
    const { error } = await supabase
      .from('clients')
      .update({ 
        user_id: userId,
        has_user_account: true,
        user_account_created_at: new Date().toISOString()
      })
      .eq('id', clientId);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error in linkUserToClient:", error);
    return false;
  }
};

// Cleanup duplicate clients (if needed)
export const cleanupDuplicateClients = async (): Promise<{
  processed: number;
  merged: number;
  errors: number;
}> => {
  // This would be a complex operation requiring custom SQL
  // For now, just returning a placeholder result
  return {
    processed: 0,
    merged: 0,
    errors: 0
  };
};
