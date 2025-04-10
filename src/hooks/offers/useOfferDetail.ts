
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
      // Try to parse JSON
      const equipmentData = JSON.parse(description);
      
      // Check if it's an array
      if (Array.isArray(equipmentData)) {
        return equipmentData.map(item => ({
          id: item.id || undefined,
          title: item.title || 'Produit sans nom',
          purchasePrice: Number(item.purchasePrice) || 0,
          quantity: Number(item.quantity) || 1,
          margin: Number(item.margin) || 0,
          monthlyPayment: Number(item.monthlyPayment) || 0,
          serialNumber: item.serialNumber || undefined
        }));
      }
      
      // If it's not an array but a single object
      if (typeof equipmentData === 'object' && equipmentData !== null) {
        // Check if it has an 'items' array
        if (Array.isArray(equipmentData.items)) {
          return equipmentData.items.map(item => ({
            id: item.id || undefined,
            title: item.title || 'Produit sans nom',
            purchasePrice: Number(item.purchasePrice) || 0,
            quantity: Number(item.quantity) || 1,
            margin: Number(item.margin) || 0,
            monthlyPayment: Number(item.monthlyPayment) || 0,
            serialNumber: item.serialNumber || undefined
          }));
        }
        
        // If it has a title, treat it as a single equipment item
        if (equipmentData.title) {
          return [{
            title: equipmentData.title,
            purchasePrice: Number(equipmentData.purchasePrice) || 0,
            quantity: Number(equipmentData.quantity) || 1,
            margin: Number(equipmentData.margin) || 0,
            monthlyPayment: Number(equipmentData.monthlyPayment) || 0,
            serialNumber: equipmentData.serialNumber
          }];
        }
      }
      
      // If it's not a recognized format, treat as a single item with the whole content
      return [{
        title: 'Description équipement',
        quantity: 1,
        monthlyPayment: 0
      }];
    } catch (e) {
      // If it's not valid JSON, treat it as a text string
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

      // If duration is not defined, use 36 months as default
      if (!data.duration) {
        data.duration = 36;
      }
      
      // Parse equipment description if it exists
      const parsedEquipment = parseEquipmentDescription(data.equipment_description);
      
      // Calculate total margin if not set
      if (!data.margin && parsedEquipment.length > 0) {
        const totalMargin = parsedEquipment.reduce((sum, item) => {
          const itemMargin = (item.margin || 0) * (item.quantity || 1);
          return sum + itemMargin;
        }, 0);
        
        data.margin = totalMargin;
      }
      
      // Update offer with parsed data
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
