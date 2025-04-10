
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Get offer by ID
 */
export const getOfferById = async (offerId: string) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (error) {
      console.error('Error fetching offer:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getOfferById:', error);
    return null;
  }
};

/**
 * Update an offer
 */
export const updateOffer = async (offerId: string, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .update(updates)
      .eq('id', offerId)
      .select();

    return { data, error };
  } catch (error) {
    console.error('Error in updateOffer:', error);
    return { data: null, error };
  }
};

/**
 * Delete an offer
 */
export const deleteOffer = async (offerId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .delete()
      .eq('id', offerId);

    if (error) {
      console.error('Error deleting offer:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in deleteOffer:', error);
    return false;
  }
};

/**
 * Update offer workflow status
 */
export const updateOfferStatus = async (
  offerId: string, 
  newStatus: string, 
  previousStatus: string,
  reason?: string
): Promise<boolean> => {
  try {
    // Log the status change
    const userId = (await supabase.auth.getUser()).data.user?.id;
    
    const { error: logError } = await supabase
      .from('offer_workflow_logs')
      .insert({
        offer_id: offerId,
        user_id: userId,
        previous_status: previousStatus,
        new_status: newStatus,
        reason: reason || `Status changed from ${previousStatus} to ${newStatus}`
      });
    
    if (logError) {
      console.error('Error logging status change:', logError);
      return false;
    }
    
    // Update the offer status
    const { error: updateError } = await supabase
      .from('offers')
      .update({ workflow_status: newStatus })
      .eq('id', offerId);
    
    if (updateError) {
      console.error('Error updating offer status:', updateError);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateOfferStatus:', error);
    return false;
  }
};

/**
 * Generate and download offer PDF
 */
export const generateAndDownloadOfferPdf = async (offerId: string): Promise<string | null> => {
  try {
    // This is just a placeholder - in a real implementation, this would call an API to generate the PDF
    console.log('Generating PDF for offer:', offerId);
    
    // Mock implementation
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const filename = `offer_${offerId.substring(0, 8)}.pdf`;
    
    // In a real implementation, we would download the PDF here
    // For now, just return the filename to indicate success
    return filename;
  } catch (error) {
    console.error('Error in generateAndDownloadOfferPdf:', error);
    toast.error("Erreur lors de la génération du PDF");
    return null;
  }
};

/**
 * Get offer notes
 */
export const getOfferNotes = async (offerId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('offer_notes')
      .select('*, profiles(first_name, last_name, email, avatar_url)')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching offer notes:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getOfferNotes:', error);
    return [];
  }
};
