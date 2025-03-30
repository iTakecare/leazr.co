import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OfferData } from "./types";

export const getOfferDetail = async (offerId: string): Promise<OfferData | null> => {
  try {
    console.log(`Fetching details for offer ${offerId}`);
    
    const { data: offer, error } = await supabase
      .from("offers")
      .select("*")
      .eq("id", offerId)
      .maybeSingle(); // Using maybeSingle instead of single to avoid errors if no record is found

    if (error) {
      console.error("Error fetching offer details:", error);
      toast.error("Impossible de récupérer les détails de l'offre");
      return null;
    }

    if (!offer) {
      console.warn(`No offer found with ID ${offerId}`);
      return null;
    }

    console.log("Offer details retrieved:", offer);
    return offer;
  } catch (error) {
    console.error("Exception in getOfferDetail:", error);
    toast.error("Une erreur est survenue lors de la récupération des détails de l'offre");
    return null;
  }
};

export const getOfferNotes = async (offerId: string) => {
  try {
    console.log(`Fetching notes for offer ${offerId}`);
    
    const { data: notes, error } = await supabase
      .from("offer_notes")
      .select("*")
      .eq("offer_id", offerId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching offer notes:", error);
      return [];
    }

    console.log(`Retrieved ${notes.length} notes for offer ${offerId}`);
    return notes;
  } catch (error) {
    console.error("Exception in getOfferNotes:", error);
    return [];
  }
};
