
import { supabase } from "@/integrations/supabase/client";

export interface OfferNote {
  id: string;
  offer_id: string;
  content: string;
  type: string;
  created_at: string;
  created_by?: string;
  profile?: {
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
    const { data, error } = await supabase
      .from('offer_notes')
      .select(`
        *,
        profiles:created_by (first_name, last_name)
      `)
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching offer notes:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching offer notes:", error);
    return [];
  }
};
