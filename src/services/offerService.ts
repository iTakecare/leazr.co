
import { adminSupabase, supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const getOfferById = async (offerId: string) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        *,
        clients:client_id (
          id, 
          name, 
          email, 
          company
        )
      `)
      .eq('id', offerId)
      .single();

    if (error) {
      console.error('Error fetching offer:', error);
      return null;
    }

    // Type assertion to tell TypeScript that data has all the fields we need
    // This ensures TypeScript knows it's safe to access these properties
    const offerData = data as any;

    // Create a copy of data with a guaranteed additional_info property
    const resultData = { 
      ...offerData, 
      equipment_data: null,
      // Ensure additional_info exists regardless of whether it's in the original data
      additional_info: offerData.additional_info || ""
    };

    if (offerData && offerData.equipment_description) {
      try {
        // Better parsing of equipment data with explicit type conversion
        const equipmentData = JSON.parse(offerData.equipment_description);
        console.log("Parsed equipment data:", equipmentData);
        
        // Ensure all numeric values are properly parsed as numbers
        if (Array.isArray(equipmentData)) {
          resultData.equipment_data = equipmentData.map(item => ({
            ...item,
            purchasePrice: parseFloat(String(item.purchasePrice)) || 0,
            quantity: parseInt(String(item.quantity), 10) || 1,
            margin: parseFloat(String(item.margin)) || 20,
            monthlyPayment: parseFloat(String(item.monthlyPayment || 0))
          }));
        } else {
          resultData.equipment_data = equipmentData;
        }
        
        console.log("Processed equipment data with preserved values:", resultData.equipment_data);
      } catch (e) {
        console.log("Equipment description is not valid JSON:", offerData.equipment_description);
      }
    }

    return resultData;
  } catch (error) {
    console.error('Error fetching offer:', error);
    return null;
  }
};

// Add the missing functions
export const getOffers = async (includeConverted: boolean = true) => {
  try {
    let query = supabase
      .from('offers')
      .select(`
        *,
        clients:client_id (
          id, 
          name, 
          email, 
          company
        )
      `)
      .order('created_at', { ascending: false });
    
    if (!includeConverted) {
      query = query.eq('converted_to_contract', false);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching offers:', error);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching offers:', error);
    return [];
  }
};

export const createOffer = async (offerData: any) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .insert([offerData])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating offer:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error creating offer:', error);
    return null;
  }
};

export const updateOffer = async (offerId: string, offerData: any) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .update(offerData)
      .eq('id', offerId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating offer:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error updating offer:', error);
    return null;
  }
};

export const deleteOffer = async (offerId: string) => {
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
    console.error('Error deleting offer:', error);
    return false;
  }
};

export const updateOfferStatus = async (
  offerId: string, 
  newStatus: string, 
  previousStatus: string, 
  reason?: string
) => {
  try {
    // Start a transaction
    const { data, error } = await supabase
      .from('offers')
      .update({ 
        workflow_status: newStatus,
        previous_status: previousStatus
      })
      .eq('id', offerId)
      .select();
    
    if (error) {
      console.error('Error updating offer status:', error);
      return false;
    }
    
    // Log the status change
    const { error: logError } = await supabase
      .from('offer_workflow_logs')
      .insert({
        offer_id: offerId,
        previous_status: previousStatus,
        new_status: newStatus,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        reason: reason
      });
    
    if (logError) {
      console.error('Error logging status change:', logError);
      // Continue despite logging error
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateOfferStatus:', error);
    return false;
  }
};

export const getWorkflowLogs = async (offerId: string) => {
  try {
    const { data, error } = await supabase
      .from('offer_workflow_logs')
      .select(`
        *,
        profiles:user_id (
          first_name,
          last_name
        )
      `)
      .eq('offer_id', offerId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching workflow logs:', error);
      return [];
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching workflow logs:', error);
    return [];
  }
};

export const sendInfoRequest = async (requestData: {
  offerId: string;
  requestedDocs: string[];
  customMessage?: string;
  previousStatus: string;
}) => {
  try {
    // Insert the info request
    const { error: requestError } = await supabase
      .from('offer_info_requests')
      .insert({
        offer_id: requestData.offerId,
        requested_documents: requestData.requestedDocs,
        message: requestData.customMessage || null,
        status: 'pending'
      });
    
    if (requestError) {
      console.error('Error creating info request:', requestError);
      return false;
    }
    
    // Update the offer status
    const success = await updateOfferStatus(
      requestData.offerId,
      'info_requested',
      requestData.previousStatus,
      'Information complémentaire demandée'
    );
    
    if (!success) {
      console.error('Error updating offer status for info request');
      return false;
    }
    
    // Here we would typically send an email to the client
    // For now we'll just log it
    console.log('Info request sent for offer ID:', requestData.offerId);
    
    return true;
  } catch (error) {
    console.error('Error in sendInfoRequest:', error);
    return false;
  }
};

export const processInfoResponse = async (offerId: string, approve: boolean) => {
  try {
    // Get the current offer to reference its previous status
    const { data: offerData, error: offerError } = await supabase
      .from('offers')
      .select('workflow_status, previous_status')
      .eq('id', offerId)
      .single();
    
    if (offerError) {
      console.error('Error fetching offer for processing info response:', offerError);
      return false;
    }
    
    // Update info request status
    const { error: updateRequestError } = await supabase
      .from('offer_info_requests')
      .update({
        status: approve ? 'approved' : 'rejected',
        response_date: new Date().toISOString()
      })
      .eq('offer_id', offerId)
      .is('response_date', null);
    
    if (updateRequestError) {
      console.error('Error updating info request status:', updateRequestError);
      // Continue despite this error
    }
    
    // Update the offer workflow status
    const newStatus = approve ? 'leaser_review' : 'rejected';
    const reason = approve 
      ? 'Informations validées, envoyé au bailleur'
      : 'Informations insuffisantes, offre rejetée';
    
    const success = await updateOfferStatus(
      offerId,
      newStatus,
      offerData.workflow_status,
      reason
    );
    
    if (!success) {
      console.error('Error updating offer status after processing info');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in processInfoResponse:', error);
    return false;
  }
};
