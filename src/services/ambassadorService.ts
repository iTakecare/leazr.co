
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Ambassador } from "@/types/ambassador";
import { createUserAccount } from "./accountService";
import { getAmbassadorClients } from "./clientService";

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

export const createAmbassador = async (
  data: CreateAmbassadorData
): Promise<Ambassador | null> => {
  try {
    console.log("Creating ambassador with data:", data);

    const { data: createdAmbassador, error } = await supabase
      .from("ambassadors")
      .insert({
        name: data.name,
        email: data.email,
        company: data.company || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        country: data.country || null,
        vat_number: data.vat_number || null,
        region: data.region || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating ambassador:", error);
      throw error;
    }

    console.log("Ambassador created:", createdAmbassador);
    return createdAmbassador;
  } catch (error) {
    console.error("Error in createAmbassador:", error);
    toast.error("Erreur lors de la création de l'ambassadeur");
    return null;
  }
};

export const createUserAccountForAmbassador = async (
  ambassador: Ambassador
): Promise<boolean> => {
  return createUserAccount(ambassador, "ambassador");
};

export const getAmbassadors = async (): Promise<Ambassador[]> => {
  try {
    const { data, error } = await supabase
      .from("ambassadors")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching ambassadors:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getAmbassadors:", error);
    toast.error("Erreur lors de la récupération des ambassadeurs");
    return [];
  }
};

export const getAmbassadorById = async (
  id: string
): Promise<Ambassador | null> => {
  try {
    const { data, error } = await supabase
      .from("ambassadors")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching ambassador:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error in getAmbassadorById:", error);
    toast.error("Erreur lors de la récupération de l'ambassadeur");
    return null;
  }
};

export const updateAmbassador = async (
  id: string,
  data: Partial<CreateAmbassadorData>
): Promise<Ambassador | null> => {
  try {
    const { data: updatedAmbassador, error } = await supabase
      .from("ambassadors")
      .update({
        name: data.name,
        email: data.email,
        company: data.company,
        phone: data.phone,
        address: data.address,
        city: data.city,
        postal_code: data.postal_code,
        country: data.country,
        vat_number: data.vat_number,
        region: data.region,
        notes: data.notes,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating ambassador:", error);
      throw error;
    }

    return updatedAmbassador;
  } catch (error) {
    console.error("Error in updateAmbassador:", error);
    toast.error("Erreur lors de la mise à jour de l'ambassadeur");
    return null;
  }
};

export const deleteAmbassador = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase.from("ambassadors").delete().eq("id", id);

    if (error) {
      console.error("Error deleting ambassador:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error in deleteAmbassador:", error);
    toast.error("Erreur lors de la suppression de l'ambassadeur");
    return false;
  }
};

export const createClientForAmbassador = async (data: {
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
}): Promise<any | null> => {
  try {
    // Create client
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: data.name,
        email: data.email,
        company: data.company || null,
        phone: data.phone || null,
        address: data.address || null,
        city: data.city || null,
        postal_code: data.postal_code || null,
        country: data.country || null,
        vat_number: data.vat_number || null,
        notes: data.notes || null,
      })
      .select()
      .single();

    if (clientError) {
      console.error("Error creating client:", clientError);
      throw clientError;
    }

    // Associate client with ambassador
    const { error: assocError } = await supabase
      .from("ambassador_clients")
      .insert({
        ambassador_id: data.ambassadorId,
        client_id: client.id,
      });

    if (assocError) {
      console.error("Error associating client with ambassador:", assocError);
      throw assocError;
    }

    // Update ambassador clients count
    const clients = await getAmbassadorClients(data.ambassadorId);
    await supabase
      .from("ambassadors")
      .update({ clients_count: clients.length })
      .eq("id", data.ambassadorId);

    return client;
  } catch (error) {
    console.error("Error in createClientForAmbassador:", error);
    toast.error("Erreur lors de la création du client");
    return null;
  }
};

export const createAmbassadorOffer = async (data: {
  ambassadorId: string;
  client_name: string;
  client_email: string;
  client_id: string | null;
  equipment_description: string;
  equipment_text: string;
  monthly_payment: number;
  commission: number;
  additional_info: string;
}): Promise<any | null> => {
  try {
    // Get ambassador details
    const { data: ambassador, error: ambassadorError } = await supabase
      .from("ambassadors")
      .select("*")
      .eq("id", data.ambassadorId)
      .single();

    if (ambassadorError) {
      console.error("Error getting ambassador:", ambassadorError);
      throw ambassadorError;
    }

    // Create offer
    const { data: offer, error: offerError } = await supabase
      .from("offers")
      .insert({
        client_name: data.client_name,
        client_email: data.client_email,
        client_id: data.client_id,
        equipment_description: data.equipment_description,
        monthly_payment: data.monthly_payment,
        status: "pending",
        workflow_status: "ambassador_created",
        type: "ambassador_offer",
        additional_info: `${data.additional_info}\n\nOffre créée par ambassadeur: ${ambassador.name} (${ambassador.email})`,
      })
      .select()
      .single();

    if (offerError) {
      console.error("Error creating offer:", offerError);
      throw offerError;
    }

    // Calculate commission based on monthly payment
    // This is a placeholder - you'll need to implement the actual commission calculation
    const commission = data.monthly_payment * 5; // Example: 5x monthly payment as commission

    // Create ambassador commission entry
    const { error: commissionError } = await supabase
      .from("ambassador_commissions")
      .insert({
        ambassador_id: data.ambassadorId,
        amount: commission,
        client_name: data.client_name,
        client_id: data.client_id,
        description: `Commission pour offre #${offer.id}`,
        status: "pending",
      });

    if (commissionError) {
      console.error("Error creating commission:", commissionError);
      // Don't throw error, still return the offer
    }

    return offer;
  } catch (error) {
    console.error("Error in createAmbassadorOffer:", error);
    toast.error("Erreur lors de la création de l'offre");
    return null;
  }
};

export const getAmbassadorCommissions = async (
  ambassadorId: string
): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from("ambassador_commissions")
      .select("*")
      .eq("ambassador_id", ambassadorId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching ambassador commissions:", error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error("Error in getAmbassadorCommissions:", error);
    toast.error("Erreur lors de la récupération des commissions");
    return [];
  }
};
