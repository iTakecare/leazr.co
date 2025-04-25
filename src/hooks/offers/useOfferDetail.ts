
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
  coefficient?: number;
}

const parseEquipmentDescription = (description?: string, coefficient?: number, monthly_payment?: number): EquipmentItem[] => {
  if (!description) return [];
  
  try {
    // Essayer de parser comme JSON d'abord (format le plus structuré)
    if (typeof description === 'string' && (description.trim().startsWith('[') || description.trim().startsWith('{'))) {
      try {
        // Essayer de le parser directement comme tableau
        let parsed;
        if (description.trim().startsWith('[')) {
          parsed = JSON.parse(description);
        } else {
          // Si c'est un objet, vérifier s'il a une propriété qui pourrait contenir un tableau
          const objParsed = JSON.parse(description);
          if (objParsed.items && Array.isArray(objParsed.items)) {
            parsed = objParsed.items;
          } else {
            // Sinon, l'encapsuler dans un tableau
            parsed = [objParsed];
          }
        }
        
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
      } catch (e) {
        console.error("Erreur lors du parsing JSON:", e);
        // Continuer avec le parsing texte si le JSON échoue
      }
    }

    // Parsing alternatif pour le format texte
    const lines = description.split('\n');
    const equipments: EquipmentItem[] = [];
    let currentEquipment: Partial<EquipmentItem> | null = null;
    let currentOptions: string[] = [];
    let totalMonthlyPayment = 0;
    
    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      if (!trimmedLine) return;
      
      // Détection des options
      if (trimmedLine.toLowerCase().startsWith('options:') || trimmedLine.toLowerCase().startsWith('option:')) {
        if (currentEquipment) {
          const optionsText = trimmedLine.substring(trimmedLine.indexOf(':') + 1).trim();
          if (optionsText) currentOptions.push(optionsText);
        }
        return;
      }
      
      // Détection du prix mensuel (fin d'un équipement)
      if (trimmedLine.includes('€/mois')) {
        if (currentEquipment) {
          const priceText = trimmedLine.split('€/mois')[0].trim();
          let price = parseFloat(priceText.replace(/\s+/g, '').replace(',', '.'));
          
          // Si on ne peut pas extraire un prix valide mais qu'on a un montant mensuel total,
          // tenter de calculer le prix unitaire en fonction du nombre d'équipements
          if (isNaN(price) && monthly_payment && equipments.length === 0) {
            price = monthly_payment; // S'il n'y a qu'un seul équipement, utiliser le montant total
          }
          
          currentEquipment.monthlyPayment = price;
          totalMonthlyPayment += (price * (currentEquipment.quantity || 1));
          
          if (currentOptions.length > 0) {
            currentEquipment.attributes = {
              ...currentEquipment.attributes,
              options: currentOptions.join('\n')
            };
          }
          
          // Calculer la marge si possible
          if (coefficient && price > 0) {
            const purchasePrice = price / coefficient * 0.8; // Estimation simplifiée de la marge
            currentEquipment.purchasePrice = purchasePrice;
            currentEquipment.margin = (price * coefficient - purchasePrice) / (price * coefficient) * 100;
          }
          
          equipments.push(currentEquipment as EquipmentItem);
          currentOptions = [];
        }
        currentEquipment = null;
        return;
      }
      
      // Détection d'un nouvel équipement
      if (!currentEquipment) {
        // Vérifier s'il y a une quantité mentionnée
        let title = trimmedLine;
        let quantity = 1;
        
        // Recherche de motifs comme "(2x)" ou "2x" dans le titre
        const quantityMatches = trimmedLine.match(/\(?(\d+)x\)?/);
        if (quantityMatches) {
          quantity = parseInt(quantityMatches[1], 10);
          title = title.replace(/\(?(\d+)x\)?/, '').trim();
        }
        
        currentEquipment = {
          title: title,
          quantity: quantity,
          monthlyPayment: 0,
          margin: 0,
          attributes: {},
          specifications: {}
        };
      } else if (trimmedLine.includes(':')) {
        // Ligne avec caractéristique/spécification
        const [key, value] = trimmedLine.split(':').map(part => part.trim());
        if (key && value) {
          currentEquipment.specifications = {
            ...currentEquipment.specifications,
            [key]: value
          };
        }
      } else {
        // Ligne supplémentaire de description
        currentOptions.push(trimmedLine);
      }
    });
    
    // Traiter le dernier équipement s'il n'a pas été fermé par un prix
    if (currentEquipment) {
      // Si on a un équipement sans prix mais qu'on connaît le montant mensuel total
      if (monthly_payment && equipments.length === 0) {
        currentEquipment.monthlyPayment = monthly_payment / (currentEquipment.quantity || 1);
        
        // Calculer la marge si possible
        if (coefficient && currentEquipment.monthlyPayment > 0) {
          const purchasePrice = currentEquipment.monthlyPayment / coefficient * 0.8;
          currentEquipment.purchasePrice = purchasePrice;
          currentEquipment.margin = (currentEquipment.monthlyPayment * coefficient - purchasePrice) / (currentEquipment.monthlyPayment * coefficient) * 100;
        }
      }
      
      if (currentOptions.length > 0) {
        currentEquipment.attributes = {
          ...currentEquipment.attributes,
          options: currentOptions.join('\n')
        };
      }
      
      equipments.push(currentEquipment as EquipmentItem);
    }
    
    // Répartir équitablement le montant mensuel si nécessaire
    if (monthly_payment && equipments.length > 0 && Math.abs(totalMonthlyPayment - monthly_payment) > 0.01) {
      // Calculer le ratio à appliquer
      const ratio = monthly_payment / totalMonthlyPayment;
      equipments.forEach(equipment => {
        equipment.monthlyPayment = parseFloat((equipment.monthlyPayment * ratio).toFixed(2));
      });
    }
    
    return equipments;
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

      // Calculer le montant financé s'il n'est pas défini mais que le coefficient et le paiement mensuel sont disponibles
      if (data.monthly_payment && data.coefficient && (!data.financed_amount || data.financed_amount === 0)) {
        data.financed_amount = parseFloat((Number(data.monthly_payment) * Number(data.coefficient)).toFixed(2));
      }

      if (!data.duration) {
        data.duration = 36;
      }
      
      // Si la marge n'est pas définie mais que le montant financé l'est, essayer de la calculer
      if (data.amount && data.financed_amount && (!data.margin || data.margin === 0)) {
        if (data.amount > data.financed_amount) {
          data.margin = parseFloat(((data.amount - data.financed_amount) / data.amount * 100).toFixed(2));
        }
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
      : parseEquipmentDescription(offer.equipment_description, offer.coefficient, offer.monthly_payment)
  } : null;

  return { 
    offer: combinedOffer, 
    loading: loading || isEquipmentLoading, 
    error, 
    fetchOffer,
    equipmentData
  };
};

export default useOfferDetail;
