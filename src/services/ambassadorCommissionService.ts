
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AmbassadorCommission {
  id: string;
  amount: number;
  clientName: string;
  date: string;
  status: string;
  description?: string;
}

export const getAmbassadorCommissions = async (ambassadorId: string): Promise<AmbassadorCommission[]> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('id, client_name, commission, created_at, commission_status, equipment_description')
      .eq('ambassador_id', ambassadorId)
      .not('commission', 'is', null)
      .gt('commission', 0)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Transformer les données pour correspondre à l'interface AmbassadorCommission
    return (data || []).map(offer => ({
      id: offer.id,
      amount: offer.commission || 0,
      clientName: offer.client_name || 'Client inconnu',
      date: offer.created_at,
      status: offer.commission_status || 'pending',
      description: `Commission pour ${offer.equipment_description ? JSON.parse(offer.equipment_description)[0]?.title || 'équipement' : 'équipement'}`
    }));
  } catch (error) {
    console.error("Error fetching ambassador commissions:", error);
    throw error;
  }
};

export const updateAmbassadorCommissionStatus = async (offerId: string, newStatus: 'pending' | 'paid' | 'cancelled'): Promise<boolean> => {
  try {
    const updateData: any = {
      commission_status: newStatus
    };
    
    // Si le statut est "payé", enregistrer la date du paiement
    if (newStatus === 'paid') {
      updateData.commission_paid_at = new Date().toISOString();
    }
    
    const { error } = await supabase
      .from('offers')
      .update(updateData)
      .eq('id', offerId);

    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error updating commission status:", error);
    toast.error("Erreur lors de la mise à jour du statut");
    return false;
  }
};

export const calculateTotalAmbassadorCommissions = async (ambassadorId: string): Promise<{ pending: number, paid: number, total: number }> => {
  try {
    const { data, error } = await supabase
      .from('offers')
      .select('commission, commission_status')
      .eq('ambassador_id', ambassadorId)
      .not('commission', 'is', null)
      .gt('commission', 0);

    if (error) throw error;

    const result = {
      pending: 0,
      paid: 0,
      total: 0
    };

    data?.forEach(offer => {
      const amount = offer.commission || 0;
      result.total += amount;
      
      if (offer.commission_status === 'paid') {
        result.paid += amount;
      } else if (offer.commission_status === 'pending') {
        result.pending += amount;
      }
    });

    return result;
  } catch (error) {
    console.error("Error calculating total commissions:", error);
    return { pending: 0, paid: 0, total: 0 };
  }
};
