
import { supabase } from '@/integrations/supabase/client';
import { RequestInfoData } from './types';
import { toast } from 'sonner';

/**
 * Send information request for an offer
 */
export const sendInfoRequest = async (requestData: RequestInfoData): Promise<boolean> => {
  try {
    const { offerId, requestedDocs, customMessage, previousStatus } = requestData;
    
    // 1. Update offer status to info_requested
    const { error: offerError } = await supabase
      .from('offers')
      .update({ 
        workflow_status: 'info_requested',
        previous_status: previousStatus
      })
      .eq('id', offerId);
    
    if (offerError) {
      console.error('Error updating offer status:', offerError);
      return false;
    }
    
    // 2. Log the status change in the workflow logs
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error: logError } = await supabase
      .from('offer_workflow_logs')
      .insert({
        offer_id: offerId,
        user_id: userId,
        previous_status: previousStatus,
        new_status: 'info_requested',
        reason: `Documents requis: ${requestedDocs.join(', ')}`
      });
    
    if (logError) {
      console.error('Error logging status change:', logError);
    }
    
    // 3. Create the info request record
    const { error: requestError } = await supabase
      .from('offer_info_requests')
      .insert({
        offer_id: offerId,
        requested_documents: requestedDocs,
        message: customMessage,
        status: 'pending'
      });
    
    if (requestError) {
      console.error('Error creating info request:', requestError);
      return false;
    }
    
    toast.success("Demande d'informations envoyée avec succès");
    return true;
  } catch (error) {
    console.error('Error in sendInfoRequest:', error);
    toast.error("Erreur lors de l'envoi de la demande d'informations");
    return false;
  }
};

/**
 * Process information response for an offer
 */
export const processInfoResponse = async (
  offerId: string, 
  responseDocuments: any[] = [], 
  comments: string = ''
): Promise<boolean> => {
  try {
    // 1. Fetch the current request
    const { data: requestData, error: requestError } = await supabase
      .from('offer_info_requests')
      .select('*')
      .eq('offer_id', offerId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (requestError) {
      console.error('Error fetching info request:', requestError);
      return false;
    }
    
    // 2. Update the request status to completed
    const { error: updateError } = await supabase
      .from('offer_info_requests')
      .update({
        status: 'completed',
        response_date: new Date().toISOString()
      })
      .eq('id', requestData.id);
    
    if (updateError) {
      console.error('Error updating info request:', updateError);
      return false;
    }
    
    // 3. Fetch the offer to get the previous status
    const { data: offerData, error: offerFetchError } = await supabase
      .from('offers')
      .select('previous_status')
      .eq('id', offerId)
      .single();
    
    if (offerFetchError) {
      console.error('Error fetching offer:', offerFetchError);
      return false;
    }
    
    // 4. Restore the previous status
    const previousStatus = offerData.previous_status || 'sent';
    
    const { error: offerUpdateError } = await supabase
      .from('offers')
      .update({
        workflow_status: previousStatus,
        previous_status: null
      })
      .eq('id', offerId);
    
    if (offerUpdateError) {
      console.error('Error updating offer status:', offerUpdateError);
      return false;
    }
    
    // 5. Log the status change
    const userId = (await supabase.auth.getUser()).data.user?.id;
    const { error: logError } = await supabase
      .from('offer_workflow_logs')
      .insert({
        offer_id: offerId,
        user_id: userId,
        previous_status: 'info_requested',
        new_status: previousStatus,
        reason: `Réponse à la demande d'informations`
      });
    
    if (logError) {
      console.error('Error logging status change:', logError);
    }
    
    // 6. Add a note about the response
    if (comments) {
      const { error: noteError } = await supabase
        .from('offer_notes')
        .insert({
          offer_id: offerId,
          content: `Réponse à la demande d'informations: ${comments}`,
          created_by: userId,
          type: 'client_note'
        });
      
      if (noteError) {
        console.error('Error adding note:', noteError);
      }
    }
    
    toast.success("Réponse traitée avec succès");
    return true;
  } catch (error) {
    console.error('Error in processInfoResponse:', error);
    toast.error("Erreur lors du traitement de la réponse");
    return false;
  }
};

/**
 * Get workflow logs for an offer
 */
export const getWorkflowLogs = async (offerId: string) => {
  try {
    const { data, error } = await supabase
      .from('offer_workflow_logs')
      .select('*, profiles(first_name, last_name, email, avatar_url)')
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching workflow logs:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getWorkflowLogs:', error);
    return [];
  }
};
