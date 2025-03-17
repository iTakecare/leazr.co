import { supabase } from "@/integrations/supabase/client";
import { Ambassador, AmbassadorCommission } from "@/types/ambassador";

export interface CreateAmbassadorData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
  region?: string;
  notes?: string;
}

export interface CreateClientForAmbassadorData {
  name: string;
  email: string;
  company?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  vat_number?: string;
  notes?: string;
  ambassadorId: string;
}

export const getAmbassadors = async () => {
  try {
    const { data, error } = await supabase
      .from("ambassadors")
      .select("*")
      .order("name");

    if (error) throw error;
    return data as Ambassador[];
  } catch (error) {
    console.error("Error fetching ambassadors:", error);
    throw error;
  }
};

export const getAmbassadorById = async (id: string) => {
  try {
    const { data, error } = await supabase
      .from("ambassadors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as Ambassador;
  } catch (error) {
    console.error("Error fetching ambassador:", error);
    throw error;
  }
};

export const createAmbassador = async (ambassadorData: CreateAmbassadorData) => {
  try {
    const { data, error } = await supabase
      .from("ambassadors")
      .insert([
        {
          ...ambassadorData,
          status: "active",
          clients_count: 0,
          commissions_total: 0,
          last_commission: 0
        }
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Ambassador;
  } catch (error) {
    console.error("Error creating ambassador:", error);
    throw error;
  }
};

export const updateAmbassador = async (id: string, ambassadorData: Partial<Ambassador>) => {
  try {
    const { data, error } = await supabase
      .from("ambassadors")
      .update(ambassadorData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as Ambassador;
  } catch (error) {
    console.error("Error updating ambassador:", error);
    throw error;
  }
};

export const deleteAmbassador = async (id: string) => {
  try {
    const { error } = await supabase
      .from("ambassadors")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting ambassador:", error);
    throw error;
  }
};

export const getAmbassadorCommissions = async (ambassadorId: string) => {
  try {
    const { data, error } = await supabase
      .from("ambassador_commissions")
      .select("*")
      .eq("ambassador_id", ambassadorId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as AmbassadorCommission[];
  } catch (error) {
    console.error("Error fetching ambassador commissions:", error);
    throw error;
  }
};

export const createClientForAmbassador = async (clientData: CreateClientForAmbassadorData) => {
  try {
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert([{
        name: clientData.name,
        email: clientData.email,
        company: clientData.company,
        phone: clientData.phone,
        address: clientData.address,
        city: clientData.city,
        postal_code: clientData.postal_code,
        country: clientData.country,
        vat_number: clientData.vat_number,
        notes: clientData.notes,
        status: "active",
        ambassador_id: clientData.ambassadorId
      }])
      .select()
      .single();

    if (clientError) throw clientError;

    const { error: updateError } = await supabase.rpc('increment_ambassador_client_count', {
      ambassador_id: clientData.ambassadorId
    });

    if (updateError) {
      console.error("Error updating ambassador client count:", updateError);
    }

    return client;
  } catch (error) {
    console.error("Error creating client for ambassador:", error);
    throw error;
  }
};

export const createAmbassadorOffer = async (offerData: any) => {
  try {
    const { data, error } = await supabase
      .from("offers")
      .insert([{
        type: "ambassador_offer",
        status: "pending",
        workflow_status: "draft",
        ambassador_id: offerData.ambassadorId,
        client_name: offerData.client_name,
        client_email: offerData.client_email,
        client_id: offerData.client_id,
        equipment_description: offerData.equipment_description,
        equipment_text: offerData.equipment_text,
        monthly_payment: offerData.monthly_payment,
        commission: offerData.commission,
        additional_info: offerData.additional_info
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error creating ambassador offer:", error);
    throw error;
  }
};

export default {
  getAmbassadors,
  getAmbassadorById,
  createAmbassador,
  updateAmbassador,
  deleteAmbassador,
  getAmbassadorCommissions,
  createClientForAmbassador,
  createAmbassadorOffer
};
