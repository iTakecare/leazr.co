
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PartnerCommission {
  id: string;
  partnerId: string;
  amount: number;
  status: 'pending' | 'paid' | 'cancelled';
  clientId?: string;
  clientName: string;
  description?: string;
  date: Date;
  createdAt: Date;
}

// Fonction pour mapper un enregistrement de la base de données vers notre interface PartnerCommission
const mapDbCommissionToCommission = (record: any): PartnerCommission => {
  return {
    id: record.id,
    partnerId: record.partner_id,
    amount: record.amount,
    status: record.status,
    clientId: record.client_id,
    clientName: record.client_name,
    description: record.description,
    date: new Date(record.date),
    createdAt: new Date(record.created_at)
  };
};

// Récupérer toutes les commissions d'un partenaire
export const getPartnerCommissions = async (partnerId: string): Promise<PartnerCommission[]> => {
  try {
    const { data, error } = await supabase
      .from('partner_commissions')
      .select('*')
      .eq('partner_id', partnerId)
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    return data ? data.map(mapDbCommissionToCommission) : [];
  } catch (error) {
    console.error("Error fetching partner commissions:", error);
    toast.error("Erreur lors du chargement des commissions");
    return [];
  }
};

// Créer une nouvelle commission
export interface CreateCommissionData {
  partnerId: string;
  amount: number;
  status?: 'pending' | 'paid' | 'cancelled';
  clientId?: string;
  clientName: string;
  description?: string;
  date?: Date;
}

export const createCommission = async (commissionData: CreateCommissionData): Promise<PartnerCommission | null> => {
  try {
    // Convertir les données du formulaire en structure de base de données
    const dbCommission = {
      partner_id: commissionData.partnerId,
      amount: commissionData.amount,
      status: commissionData.status || 'pending',
      client_id: commissionData.clientId,
      client_name: commissionData.clientName,
      description: commissionData.description,
      date: commissionData.date ? commissionData.date.toISOString() : new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('partner_commissions')
      .insert(dbCommission)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success("Commission créée avec succès");
    return data ? mapDbCommissionToCommission(data) : null;
  } catch (error) {
    console.error("Error creating commission:", error);
    toast.error("Erreur lors de la création de la commission");
    return null;
  }
};

// Mettre à jour le statut d'une commission
export const updateCommissionStatus = async (id: string, status: 'pending' | 'paid' | 'cancelled'): Promise<PartnerCommission | null> => {
  try {
    const { data, error } = await supabase
      .from('partner_commissions')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    toast.success(`Statut de la commission mis à jour: ${status}`);
    return data ? mapDbCommissionToCommission(data) : null;
  } catch (error) {
    console.error("Error updating commission status:", error);
    toast.error("Erreur lors de la mise à jour du statut de la commission");
    return null;
  }
};

// Supprimer une commission
export const deleteCommission = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('partner_commissions')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    toast.success("Commission supprimée avec succès");
    return true;
  } catch (error) {
    console.error("Error deleting commission:", error);
    toast.error("Erreur lors de la suppression de la commission");
    return false;
  }
};

// Calculer le total des commissions pour un partenaire
export const calculateTotalCommissions = async (partnerId: string): Promise<{ pending: number; paid: number; total: number }> => {
  try {
    const { data, error } = await supabase
      .from('partner_commissions')
      .select('amount, status')
      .eq('partner_id', partnerId);
    
    if (error) throw error;
    
    let pending = 0;
    let paid = 0;
    
    if (data) {
      data.forEach(commission => {
        if (commission.status === 'pending') {
          pending += Number(commission.amount);
        } else if (commission.status === 'paid') {
          paid += Number(commission.amount);
        }
      });
    }
    
    return {
      pending,
      paid,
      total: pending + paid
    };
  } catch (error) {
    console.error("Error calculating total commissions:", error);
    return { pending: 0, paid: 0, total: 0 };
  }
};
