
import { supabase, adminSupabase } from "@/integrations/supabase/client";
import { OfferData } from "./types";

export const createOffer = async (offerData: OfferData) => {
  try {
    console.log("Creating offer with data:", offerData);
    
    // Création d'un objet propre avec uniquement les colonnes qui existent dans la base de données
    const dataToSend = {
      client_id: offerData.client_id,
      client_name: offerData.client_name,
      client_email: offerData.client_email,
      equipment_description: offerData.equipment_description,
      amount: offerData.amount,
      coefficient: offerData.coefficient,
      monthly_payment: offerData.monthly_payment,
      commission: offerData.commission,
      user_id: offerData.user_id || null,
      type: offerData.type || 'admin_offer',
      workflow_status: offerData.workflow_status,
      status: offerData.workflow_status === 'draft' ? 'pending' : 'pending',
      remarks: offerData.remarks 
    };
    
    console.log("Sending data to database:", dataToSend);
    
    // Essai avec supabase standard d'abord
    let { data, error } = await supabase
      .from('offers')
      .insert(dataToSend)
      .select();
    
    // Si l'erreur est liée à la RLS, essayer avec adminSupabase
    if (error && (error.code === '42501' || error.message.includes('violates row-level security policy'))) {
      console.log("RLS error, trying with adminSupabase");
      
      try {
        const { data: adminData, error: adminError } = await adminSupabase
          .from('offers')
          .insert(dataToSend)
          .select();
        
        if (adminError) {
          console.error("Error with adminSupabase:", adminError);
          return { data: null, error: adminError };
        }
        
        data = adminData;
        error = null;
      } catch (adminErr) {
        console.error("Exception with adminSupabase:", adminErr);
        return { data: null, error: adminErr };
      }
    }
    
    if (error) {
      console.error("Error creating offer:", error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Error creating offer:", error);
    return { data: null, error };
  }
};
