import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OfferEquipment } from '@/types/offerEquipment';
import { getOfferEquipment, migrateEquipmentFromJson } from '@/services/offers/offerEquipment';

export interface EquipmentItem {
  id?: string;
  title: string;
  purchasePrice?: number;
  quantity: number;
  margin?: number;
  monthlyPayment: number;
  serialNumber?: string;
  attributes?: Record<string, string>;
  specifications?: Record<string, string | number>;
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
  const [equipmentData, setEquipmentData] = useState<OfferEquipment[]>([]);
  const [isEquipmentLoading, setIsEquipmentLoading] = useState(false);

  const convertDbEquipmentToUiFormat = (dbEquipment: OfferEquipment[]): EquipmentItem[] => {
    return dbEquipment.map(item => {
      const attributes: Record<string, string> = {};
      if (item.attributes && item.attributes.length > 0) {
        item.attributes.forEach(attr => {
          attributes[attr.key] = attr.value;
        });
      }
      
      const specifications: Record<string, string | number> = {};
      if (item.specifications && item.specifications.length > 0) {
        item.specifications.forEach(spec => {
          const numValue = Number(spec.value);
          specifications[spec.key] = !isNaN(numValue) ? numValue : spec.value;
        });
      }
      
      return {
        id: item.id,
        title: item.title,
        purchasePrice: item.purchase_price,
        quantity: item.quantity,
        margin: item.margin,
        monthlyPayment: item.monthly_payment || 0,
        serialNumber: item.serial_number,
        attributes,
        specifications
      };
    });
  };

const parseEquipmentDescription = (description?: string): EquipmentItem[] => {
  if (!description) return [];
  
  try {
    // Si la description est une chaîne JSON valide
    if (typeof description === 'string') {
      try {
        const parsed = JSON.parse(description);
        if (Array.isArray(parsed)) {
          return parsed.map(item => ({
            id: item.id,
            title: item.title || 'Produit sans nom',
            purchasePrice: Number(item.purchasePrice) || 0,
            quantity: Number(item.quantity) || 1,
            margin: Number(item.margin) || 0,
            monthlyPayment: Number(item.monthlyPayment) || 0,
            serialNumber: item.serialNumber || undefined,
            attributes: item.attributes || {},
            specifications: item.specifications || {}
          }));
        }
      } catch (parseError) {
        // Si ce n'est pas du JSON, on traite comme du texte formaté
        const lines = description.split('\n');
        const equipments: EquipmentItem[] = [];
        let currentEquipment: Partial<EquipmentItem> | null = null;
        
        lines.forEach(line => {
          const trimmedLine = line.trim();
          
          // Ignorer les lignes vides
          if (!trimmedLine) return;
          
          // Si la ligne commence par "Options:", on l'ajoute aux attributs de l'équipement courant
          if (trimmedLine.toLowerCase().startsWith('options:')) {
            if (currentEquipment) {
              const optionsText = trimmedLine.substring(8).trim();
              const options = optionsText.split(',').map(opt => opt.trim());
              currentEquipment.attributes = {
                ...currentEquipment.attributes,
                options: options.join(', ')
              };
            }
            return;
          }
          
          // Si la ligne contient un prix mensuel
          if (trimmedLine.includes('€/mois')) {
            if (currentEquipment) {
              const priceText = trimmedLine.split('€/mois')[0].trim();
              const price = parseFloat(priceText.replace(',', '.'));
              currentEquipment.monthlyPayment = price;
              equipments.push(currentEquipment as EquipmentItem);
            }
            currentEquipment = null;
            return;
          }
          
          // Si on n'est pas dans les cas précédents, c'est un nouvel équipement
          if (!currentEquipment) {
            currentEquipment = {
              title: trimmedLine,
              quantity: 1,
              monthlyPayment: 0,
              margin: 0,
              attributes: {},
              specifications: {}
            };
          }
        });
        
        // Ajouter le dernier équipement s'il existe
        if (currentEquipment) {
          equipments.push(currentEquipment as EquipmentItem);
        }
        
        return equipments;
      }
    }
    
    return [];
  } catch (e) {
    console.error("Erreur lors du parsing de la description de l'équipement:", e);
    return [{
      title: description || 'Équipement non détaillé',
      quantity: 1,
      monthlyPayment: 0,
      margin: 0,
      attributes: {},
      specifications: {}
    }];
  }
};

  const fetchEquipmentData = async (offerId: string) => {
    try {
      setIsEquipmentLoading(true);
      const equipment = await getOfferEquipment(offerId);
      setEquipmentData(equipment);
      
      if (equipment.length === 0 && offer?.equipment_description) {
        const migrationSuccess = await migrateEquipmentFromJson(offerId, offer.equipment_description);
        
        if (migrationSuccess) {
          const migratedEquipment = await getOfferEquipment(offerId);
          setEquipmentData(migratedEquipment);
        }
      }
    } catch (err) {
      console.error("Erreur lors du chargement des équipements:", err);
    } finally {
      setIsEquipmentLoading(false);
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

      if (!data.duration) {
        data.duration = 36;
      }
      
      setOffer(data as OfferDetail);
      
      fetchEquipmentData(offerId);
      
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

  const combinedOffer = offer ? {
    ...offer,
    parsedEquipment: equipmentData.length > 0 
      ? convertDbEquipmentToUiFormat(equipmentData) 
      : parseEquipmentDescription(offer.equipment_description)
  } : null;

  return { 
    offer: combinedOffer, 
    loading: loading || isEquipmentLoading, 
    error, 
    fetchOffer,
    equipmentData
  };
};
