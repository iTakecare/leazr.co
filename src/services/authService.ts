
import { supabase } from "@/integrations/supabase/client";

/**
 * Get user role from the database
 * @param userId User ID
 * @returns Role string or null
 */
export const getUserRole = async (userId: string): Promise<string | null> => {
  if (!userId) return null;
  
  try {
    // First check the profiles table for role
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("Error fetching user role:", error);
      return null;
    }
    
    // Return the role if found
    if (data && data.role) {
      return data.role;
    }
    
    // If no role in profiles, check if user is in clients table
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!clientError && clientData) {
      return 'client';
    }
    
    // Check if user is an ambassador
    const { data: ambassadorData, error: ambassadorError } = await supabase
      .from('ambassadors')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!ambassadorError && ambassadorData) {
      return 'ambassador';
    }
    
    // Check if user is a partner
    const { data: partnerData, error: partnerError } = await supabase
      .from('partners')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!partnerError && partnerData) {
      return 'partner';
    }
    
    // Default to null if no role found
    return null;
  } catch (error) {
    console.error("Error in getUserRole:", error);
    return null;
  }
};
