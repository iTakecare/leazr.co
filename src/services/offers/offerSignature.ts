
import { supabase } from '@/integrations/supabase/client';

/**
 * Generate a signature link for an offer
 */
export const generateSignatureLink = (offerId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/client/sign/${offerId}`;
};

/**
 * Get offer details for client view
 */
export const getOfferForClient = async (offerId: string) => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .eq('id', offerId)
      .single();

    if (error) {
      console.error('Error fetching offer for client:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getOfferForClient:', error);
    return null;
  }
};

/**
 * Check if offer is signed
 */
export const isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('signed_at, signer_name')
      .eq('id', offerId)
      .single();

    if (error) {
      console.error('Error checking if offer is signed:', error);
      return false;
    }

    return !!data.signed_at && !!data.signer_name;
  } catch (error) {
    console.error('Error in isOfferSigned:', error);
    return false;
  }
};

/**
 * Save offer signature
 */
export const saveOfferSignature = async (
  offerId: string, 
  signatureData: string, 
  signerName: string, 
  signerIp: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('offers')
      .update({
        signature_data: signatureData,
        signer_name: signerName,
        signer_ip: signerIp,
        signed_at: new Date().toISOString(),
        workflow_status: 'approved'
      })
      .eq('id', offerId);

    if (error) {
      console.error('Error saving offer signature:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in saveOfferSignature:', error);
    return false;
  }
};
