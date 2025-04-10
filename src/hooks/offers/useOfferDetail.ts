
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EquipmentItem {
  id?: string;
  title: string;
  purchasePrice?: number;
  quantity: number;
  margin?: number;
  monthlyPayment: number;
  serialNumber?: string;
}

export interface OfferDetail {
  id: string;
  created_at: string;
  updated_at: string;
  amount?: number;
  financed_amount?: number;
  workflow_status: string;
  converted_to_contract: boolean;
  client_name: string;
  client_email: string;
  client_company?: string;
  equipment_description?: string;
  parsedEquipment?: EquipmentItem[];
  monthly_payment?: number;
  duration?: number;
  remarks?: string;
  signed_at?: string;
  signer_name?: string;
  signer_ip?: string;
  margin?: number;
  margin_difference?: number;
  total_margin_with_difference?: number;
}

export const useOfferDetail = (offerId: string) => {
  const [offer, setOffer] = useState<OfferDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const parseEquipmentDescription = (description?: string): EquipmentItem[] => {
    if (!description) return [];
    
    try {
      // Essayer de parser le JSON
      const equipmentData = JSON.parse(description);
      
      // Vérifier si c'est un tableau
      if (Array.isArray(equipmentData)) {
        return equipmentData.map(item => ({
          id: item.id || undefined,
          title: item.title || 'Produit sans nom',
          purchasePrice: item.purchasePrice || 0,
          quantity: item.quantity || 1,
          margin: item.margin || 0,
          monthlyPayment: item.monthlyPayment || 0,
          serialNumber: item.serialNumber || undefined
        }));
      }
      
      // Si ce n'est pas un tableau, retourner un tableau avec un seul élément
      return [{
        title: 'Description équipement',
        quantity: 1,
        monthlyPayment: 0
      }];
    } catch (e) {
      // Si ce n'est pas un JSON valide, le traiter comme une chaîne de texte
      return [{
        title: description,
        quantity: 1,
        monthlyPayment: 0
      }];
    }
  };

  const fetchOffer = async () => {
    if (!offerId) {
      setError("ID d'offre invalide");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('offers')
        .select('*')
        .eq('id', offerId)
        .single();

      if (error) {
        console.error('Error fetching offer:', error);
        setError("Erreur lors de la récupération des détails de l'offre");
        return;
      }

      // Si la durée n'est pas définie, utiliser 36 mois par défaut
      if (!data.duration) {
        data.duration = 36;
      }
      
      // Parser la description de l'équipement si elle existe
      const parsedEquipment = parseEquipmentDescription(data.equipment_description);
      
      // Mettre à jour l'offre avec les données analysées
      setOffer({
        ...data as OfferDetail,
        parsedEquipment
      });
    } catch (err) {
      console.error('Error in useOfferDetail:', err);
      setError("Une erreur s'est produite lors du chargement des détails de l'offre");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffer();
  }, [offerId]);

  return { offer, loading, error, fetchOffer };
};
