
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

  // Convertir les équipements de la base de données en format EquipmentItem pour l'UI
  const convertDbEquipmentToUiFormat = (dbEquipment: OfferEquipment[]): EquipmentItem[] => {
    return dbEquipment.map(item => {
      // Convertir les attributs en objet Record
      const attributes: Record<string, string> = {};
      if (item.attributes && item.attributes.length > 0) {
        item.attributes.forEach(attr => {
          attributes[attr.key] = attr.value;
        });
      }
      
      // Convertir les spécifications en objet Record
      const specifications: Record<string, string | number> = {};
      if (item.specifications && item.specifications.length > 0) {
        item.specifications.forEach(spec => {
          // Essayer de convertir en nombre si possible
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

  // Analyse de la description d'équipement JSON (pour rétrocompatibilité)
  const parseEquipmentDescription = (description?: string): EquipmentItem[] => {
    if (!description) return [];
    
    try {
      // Try to parse JSON
      let equipmentData;
      
      try {
        equipmentData = JSON.parse(description);
      } catch (parseError) {
        console.error("Erreur lors du parsing initial:", parseError);
        return [{
          title: description,
          quantity: 1,
          monthlyPayment: 0,
          attributes: {},
          specifications: {}
        }];
      }
      
      console.log("Données d'équipement brutes:", equipmentData);
      
      // Check if it's an array
      if (Array.isArray(equipmentData)) {
        return equipmentData.map(item => {
          console.log("Traitement de l'élément:", item);
          
          // Log attributes and specifications specifically
          console.log("Attributs:", item.attributes);
          console.log("Spécifications:", item.specifications);
          
          return {
            id: item.id || undefined,
            title: item.title || 'Produit sans nom',
            purchasePrice: Number(item.purchasePrice) || 0,
            quantity: Number(item.quantity) || 1,
            margin: Number(item.margin) || 0,
            monthlyPayment: Number(item.monthlyPayment) || 0,
            serialNumber: item.serialNumber || undefined,
            // Make sure to preserve attributes and specifications exactly as they are
            attributes: item.attributes || {},
            specifications: item.specifications || {},
            // Support for variants (old structure)
            ...(item.variants && typeof item.variants === 'object' && { specifications: item.variants })
          };
        });
      }
      
      // Si ce n'est pas un tableau mais un objet unique
      if (typeof equipmentData === 'object' && equipmentData !== null) {
        // Vérifier s'il contient un tableau 'items'
        if (Array.isArray(equipmentData.items)) {
          return equipmentData.items.map(item => ({
            id: item.id || undefined,
            title: item.title || 'Produit sans nom',
            purchasePrice: Number(item.purchasePrice) || 0,
            quantity: Number(item.quantity) || 1,
            margin: Number(item.margin) || 0,
            monthlyPayment: Number(item.monthlyPayment) || 0,
            serialNumber: item.serialNumber || undefined,
            attributes: item.attributes || {},
            specifications: item.specifications || {},
            ...(item.variants && typeof item.variants === 'object' && { specifications: item.variants })
          }));
        }
        
        // S'il a un titre, le traiter comme un seul équipement
        if (equipmentData.title) {
          return [{
            title: equipmentData.title,
            purchasePrice: Number(equipmentData.purchasePrice) || 0,
            quantity: Number(equipmentData.quantity) || 1,
            margin: Number(equipmentData.margin) || 0,
            monthlyPayment: Number(equipmentData.monthlyPayment) || 0,
            serialNumber: equipmentData.serialNumber,
            attributes: equipmentData.attributes || {},
            specifications: equipmentData.specifications || {},
            ...(equipmentData.variants && typeof equipmentData.variants === 'object' && { specifications: equipmentData.variants })
          }];
        }
      }
      
      // Si le format n'est pas reconnu, traiter comme un seul élément avec tout le contenu
      return [{
        title: 'Description équipement',
        quantity: 1,
        monthlyPayment: 0,
        attributes: {},
        specifications: {}
      }];
    } catch (e) {
      console.error("Erreur lors du parsing de la description de l'équipement:", e);
      // Si ce n'est pas un JSON valide, le traiter comme une chaîne de texte
      return [{
        title: description,
        quantity: 1,
        monthlyPayment: 0,
        attributes: {},
        specifications: {}
      }];
    }
  };

  // Récupération des équipements depuis la nouvelle structure de tables
  const fetchEquipmentData = async (offerId: string) => {
    try {
      setIsEquipmentLoading(true);
      const equipment = await getOfferEquipment(offerId);
      setEquipmentData(equipment);
      
      if (equipment.length === 0 && offer?.equipment_description) {
        // Si aucun équipement n'est trouvé, essayer de migrer depuis le JSON
        const migrationSuccess = await migrateEquipmentFromJson(offerId, offer.equipment_description);
        
        if (migrationSuccess) {
          // Récupérer à nouveau les équipements après la migration
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

      // If duration is not defined, use 36 months as default
      if (!data.duration) {
        data.duration = 36;
      }
      
      // Stocker l'offre dans l'état
      setOffer(data as OfferDetail);
      
      // Récupérer les équipements de la nouvelle structure de tables
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

  // Combiner les données d'équipement et l'offre pour l'UI
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
