
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OfferNote {
  id: string;
  offer_id: string;
  content: string;
  type: string;
  created_at: string;
  created_by?: string;
  profiles?: {
    first_name?: string;
    last_name?: string;
  };
}

/**
 * Retrieves notes for a specific offer
 * @param offerId The ID of the offer
 * @returns Array of notes
 */
export const getOfferNotes = async (offerId: string): Promise<OfferNote[]> => {
  try {
    console.log("Fetching offer notes for offer:", offerId);
    
    const { data, error } = await supabase
      .from('offer_notes')
      .select(`
        *,
        profiles:created_by (
          first_name, 
          last_name
        )
      `)
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching offer notes:", error);
      return [];
    }

    console.log("Offer notes fetched successfully:", data?.length || 0, "notes");
    return data || [];
  } catch (error) {
    console.error("Error fetching offer notes:", error);
    return [];
  }
};

/**
 * Adds a note to an offer
 * @param offerId The ID of the offer
 * @param content Content of the note
 * @param type Type of the note (e.g., "system", "user", "info")
 * @returns Boolean indicating success or failure
 */
export const addOfferNote = async (
  offerId: string,
  content: string,
  type: string = "user"
): Promise<boolean> => {
  try {
    console.log("Adding offer note for offer:", offerId);
    
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      console.error("Error getting current user:", userError);
      return false;
    }

    const { data, error } = await supabase
      .from('offer_notes')
      .insert({
        offer_id: offerId,
        content,
        type,
        created_by: userData.user.id
      });

    if (error) {
      console.error("Error adding offer note:", error);
      return false;
    }

    console.log("Offer note added successfully");
    return true;
  } catch (error) {
    console.error("Error adding offer note:", error);
    return false;
  }
};
