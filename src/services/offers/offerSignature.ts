
import { supabase } from "@/integrations/supabase/client";

export const generateSignatureLink = (offerId: string): string => {
  const baseUrl = window.location.origin;
  return `${baseUrl}/offer/${offerId}`;
};

export const isOfferSigned = async (offerId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('signature_data, signed_at')
      .eq('id', offerId)
      .single();

    if (error) {
      console.error("Error checking offer signature:", error);
      return false;
    }

    return !!(data.signature_data && data.signed_at);
  } catch (error) {
    console.error("Error in isOfferSigned:", error);
    return false;
  }
};

export const getOfferForClient = async (offerId: string) => {
  try {
    console.log("🔍 Getting offer for client:", offerId);
    
    const { data, error } = await supabase
      .from('offers')
      .select('*, clients(name, email, company)')
      .eq('id', offerId)
      .single();
    
    if (error) {
      console.error("❌ Error getting offer for client:", error);
      throw error;
    }
    
    console.log("✅ Offer for client retrieved:", data);
    return data;
  } catch (error) {
    console.error("❌ Error in getOfferForClient:", error);
    throw error;
  }
};

export const saveOfferSignature = async (
  offerId: string,
  signatureData: string,
  signerName: string,
  signerIp?: string
) => {
  try {
    console.log("💾 Saving signature for offer:", offerId);
    
    const { data, error } = await supabase
      .from('offers')
      .update({
        signature_data: signatureData,
        signer_name: signerName,
        signed_at: new Date().toISOString(),
        signer_ip: signerIp,
        workflow_status: 'signed'
      })
      .eq('id', offerId)
      .select()
      .single();

    if (error) {
      console.error("❌ Error saving signature:", error);
      throw error;
    }

    console.log("✅ Signature saved successfully:", data);
    return { data, error: null };
  } catch (error) {
    console.error("❌ Error in saveOfferSignature:", error);
    return { data: null, error };
  }
};
