import { supabase } from "@/integrations/supabase/client";
import { generateAndDownloadOfferPdf } from "./offerPdf";

export const isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('signature_data, signed_at')
      .eq('id', offerId)
      .single();
    
    if (error) throw error;
    
    return !!(data && data.signature_data && data.signed_at);
  } catch (error) {
    console.error("Error checking if offer is signed:", error);
    return false;
  }
};

export const saveOfferSignature = async (
  offerId: string,
  signatureData: string,
  signerName: string,
  signerIp?: string
): Promise<{ success: boolean; error?: any }> => {
  try {
    const now = new Date().toISOString();
    
    // Update offer with signature data
    const { error } = await supabase
      .from('offers')
      .update({
        signature_data: signatureData,
        signed_at: now,
        signer_name: signerName,
        signer_ip: signerIp,
        workflow_status: 'signed',
        previous_status: 'sent' // Assuming it was sent before signing
      })
      .eq('id', offerId);
    
    if (error) throw error;
    
    // Log the workflow status change
    try {
      await supabase
        .from('offer_workflow_logs')
        .insert([{
          offer_id: offerId,
          previous_status: 'sent',
          new_status: 'signed',
          user_id: '00000000-0000-0000-0000-000000000000', // System user ID for client-initiated actions
          reason: `Offer signed by ${signerName}`
        }]);
    } catch (logError) {
      console.error("Error logging workflow status change:", logError);
      // Not throwing here to ensure the signature is saved even if logging fails
    }
    
    console.log(`Signature saved successfully for offer ${offerId}`);
    return { success: true };
  } catch (error) {
    console.error("Error saving offer signature:", error);
    return { success: false, error };
  }
};

export const generateSignatureLink = (offerId: string, clientEmail?: string): string => {
  const baseUrl = window.location.origin;
  let url = `${baseUrl}/client/sign/${offerId}`;
  
  if (clientEmail) {
    // Add client email as query parameter for verification
    url += `?email=${encodeURIComponent(clientEmail)}`;
  }
  
  return url;
};

export const getOfferForClient = async (offerId: string, clientEmail?: string) => {
  try {
    let query = supabase
      .from('offers')
      .select('*')
      .eq('id', offerId);
    
    // If client email is provided, use it for additional verification
    if (clientEmail) {
      query = query.eq('client_email', clientEmail);
    }
    
    const { data, error } = await query.single();
    
    if (error) throw error;
    if (!data) return null;
    
    // Parse equipment data if available
    if (data.equipment_description) {
      try {
        // Try to parse as JSON if it's a string
        if (typeof data.equipment_description === 'string') {
          const parsedEquipment = JSON.parse(data.equipment_description);
          data.parsedEquipment = parsedEquipment;
        }
      } catch (parseError) {
        console.error("Error parsing equipment data:", parseError);
        // If parsing fails, keep the original string
      }
    }
    
    return data;
  } catch (error) {
    console.error("Error getting offer for client:", error);
    return null;
  }
};

// Generate and download PDF
export const generateSignedOfferPdf = async (offerId: string): Promise<string | null> => {
  try {
    // Use the existing PDF generation function
    return await generateAndDownloadOfferPdf(offerId, true);
  } catch (error) {
    console.error("Error generating signed offer PDF:", error);
    return null;
  }
};
