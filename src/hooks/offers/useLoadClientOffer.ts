
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { OfferData } from '@/services/offers/types';
import { forceMigrateEquipmentData, getOfferEquipment } from '@/services/offerService';
import { EquipmentItem } from '@/hooks/offers/useOfferDetail';

export const useLoadClientOffer = (offerId: string | undefined) => {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const fetchOffer = async () => {
      if (!offerId) {
        setError("L'identifiant de l'offre est manquant");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log("Fetching offer with ID:", offerId);
        
        const { data: offerData, error: offerError } = await supabase
          .from('offers')
          .select('*, clients(*)') 
          .eq('id', offerId)
          .single();

        if (offerError || !offerData) {
          console.error("Error fetching offer:", offerError);
          setError(offerError?.message || "Offre introuvable");
          setLoading(false);
          return;
        }

        console.log("Fetched offer data:", offerData);
        
        // Check if the offer is already signed
        const hasSignature = !!offerData.signature_data && !!offerData.signer_name;
        setSigned(hasSignature);

        // Fetch equipment details
        let parsedEquipment = await fetchEquipmentDetails(offerId, offerData);
        
        // Ensure each equipment item has attributes and specifications
        parsedEquipment = parsedEquipment.map(item => ({
          ...item,
          attributes: item.attributes || {},
          specifications: item.specifications || {}
        }));
        
        // Store debug info
        setDebugInfo({
          offerData,
          parsedEquipment,
          hasSignature
        });

        // Update the offer with parsed equipment
        setOffer({
          ...offerData,
          parsedEquipment
        });
        
        console.log("Final offer with equipment:", {
          ...offerData,
          parsedEquipment
        });
      } catch (error) {
        console.error("Error in useLoadClientOffer:", error);
        setError("Une erreur s'est produite lors du chargement de l'offre");
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [offerId]);

  // Helper function to fetch equipment details
  const fetchEquipmentDetails = async (offerId: string, offerData: any): Promise<EquipmentItem[]> => {
    try {
      console.log("Fetching equipment details for offer:", offerId);
      
      // First try to get equipment from offer_equipment table
      const equipment = await getOfferEquipment(offerId);
      console.log("Equipment from DB:", equipment);
      
      if (equipment && equipment.length > 0) {
        // Convert DB format to UI format
        return equipment.map(item => ({
          id: item.id,
          title: item.title,
          purchasePrice: item.purchase_price,
          quantity: item.quantity,
          margin: item.margin,
          monthlyPayment: item.monthly_payment || 0,
          attributes: convertAttributesToObject(item.attributes),
          specifications: convertSpecificationsToObject(item.specifications)
        }));
      }
      
      // If no equipment in DB, try to force migrate from JSON
      console.log("No equipment found, trying to migrate from JSON");
      if (offerData.equipment_description) {
        const migrationSuccess = await forceMigrateEquipmentData(offerId);
        console.log("Migration success:", migrationSuccess);
        
        if (migrationSuccess) {
          // Try to get equipment again after migration
          const migratedEquipment = await getOfferEquipment(offerId);
          console.log("Equipment after migration:", migratedEquipment);
          
          if (migratedEquipment && migratedEquipment.length > 0) {
            // Convert DB format to UI format
            return migratedEquipment.map(item => ({
              id: item.id,
              title: item.title,
              purchasePrice: item.purchase_price,
              quantity: item.quantity,
              margin: item.margin,
              monthlyPayment: item.monthly_payment || 0,
              attributes: convertAttributesToObject(item.attributes),
              specifications: convertSpecificationsToObject(item.specifications)
            }));
          }
        }
      }
      
      // If migration failed or no equipment_description, try to parse JSON directly
      console.log("Trying to parse JSON directly from equipment_description");
      if (offerData.equipment_description) {
        try {
          // Try to parse as JSON
          const parsedEquipment = parseEquipmentDescription(offerData.equipment_description);
          console.log("Parsed equipment from JSON:", parsedEquipment);
          return parsedEquipment;
        } catch (error) {
          console.error("Error parsing equipment description:", error);
        }
      }
      
      console.log("No equipment data found");
      return [];
    } catch (error) {
      console.error("Error fetching equipment details:", error);
      return [];
    }
  };

  // Helper function to convert attributes array to object
  const convertAttributesToObject = (attributes: any[] | undefined) => {
    if (!attributes || !Array.isArray(attributes)) return {};
    
    const result: Record<string, string> = {};
    attributes.forEach(attr => {
      if (attr && attr.key) {
        result[attr.key] = attr.value || '';
      }
    });
    return result;
  };

  // Helper function to convert specifications array to object
  const convertSpecificationsToObject = (specifications: any[] | undefined) => {
    if (!specifications || !Array.isArray(specifications)) return {};
    
    const result: Record<string, string | number> = {};
    specifications.forEach(spec => {
      if (spec && spec.key) {
        result[spec.key] = spec.value || '';
      }
    });
    return result;
  };

  // Parse equipment description JSON with detailed logging
  const parseEquipmentDescription = (description: string): EquipmentItem[] => {
    if (!description) return [];
    
    try {
      console.log("Parsing equipment description:", description);
      
      // Try to parse JSON
      let equipmentData;
      
      try {
        equipmentData = JSON.parse(description);
        console.log("Successfully parsed as JSON:", equipmentData);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError);
        return [{
          title: description,
          quantity: 1,
          monthlyPayment: 0,
          purchasePrice: 0,
          margin: 0,
          attributes: {},
          specifications: {}
        }];
      }
      
      console.log("Raw equipment data:", equipmentData);
      
      // Check if it's an array
      if (Array.isArray(equipmentData)) {
        console.log("Equipment data is an array, processing items");
        return equipmentData.map(item => {
          console.log("Processing equipment item:", item);
          
          // Normalize attributes and specifications
          let attributes: Record<string, string> = {};
          let specifications: Record<string, string | number> = {};
          
          // Process attributes
          if (item.attributes) {
            console.log("Processing attributes:", item.attributes);
            if (Array.isArray(item.attributes)) {
              item.attributes.forEach((attr: any) => {
                attributes[attr.key] = attr.value;
              });
            } else if (typeof item.attributes === 'object') {
              attributes = { ...item.attributes };
            }
          }
          
          // Process specifications
          if (item.specifications) {
            console.log("Processing specifications:", item.specifications);
            if (Array.isArray(item.specifications)) {
              item.specifications.forEach((spec: any) => {
                specifications[spec.key] = spec.value;
              });
            } else if (typeof item.specifications === 'object') {
              specifications = { ...item.specifications };
            }
          } else if (item.variants && typeof item.variants === 'object') {
            // Support for old format that used "variants"
            console.log("Using variants as specifications:", item.variants);
            specifications = { ...item.variants };
          }
          
          const result = {
            id: item.id || undefined,
            title: item.title || 'Produit sans nom',
            purchasePrice: Number(item.purchasePrice) || 0,
            quantity: Number(item.quantity) || 1,
            margin: Number(item.margin) || 0,
            monthlyPayment: Number(item.monthlyPayment) || 0,
            attributes,
            specifications
          };
          
          console.log("Normalized equipment item:", result);
          return result;
        });
      }
      
      // If not an array but a single object
      if (typeof equipmentData === 'object' && equipmentData !== null) {
        console.log("Equipment data is an object, checking for items array");
        
        // Check if it contains an 'items' array
        if (Array.isArray(equipmentData.items)) {
          console.log("Processing items array from object");
          return equipmentData.items.map((item: any) => {
            // Normalize attributes and specifications
            let attributes: Record<string, string> = {};
            let specifications: Record<string, string | number> = {};
            
            if (item.attributes) {
              if (Array.isArray(item.attributes)) {
                item.attributes.forEach((attr: any) => {
                  attributes[attr.key] = attr.value;
                });
              } else if (typeof item.attributes === 'object') {
                attributes = { ...item.attributes };
              }
            }
            
            if (item.specifications) {
              if (Array.isArray(item.specifications)) {
                item.specifications.forEach((spec: any) => {
                  specifications[spec.key] = spec.value;
                });
              } else if (typeof item.specifications === 'object') {
                specifications = { ...item.specifications };
              }
            } else if (item.variants && typeof item.variants === 'object') {
              specifications = { ...item.variants };
            }
            
            return {
              id: item.id || undefined,
              title: item.title || 'Produit sans nom',
              purchasePrice: Number(item.purchasePrice) || 0,
              quantity: Number(item.quantity) || 1,
              margin: Number(item.margin) || 0,
              monthlyPayment: Number(item.monthlyPayment) || 0,
              attributes,
              specifications
            };
          });
        }
        
        // If it has a title, treat it as a single equipment
        if (equipmentData.title) {
          console.log("Treating as single equipment item with title");
          // Normalize attributes and specifications
          let attributes: Record<string, string> = {};
          let specifications: Record<string, string | number> = {};
          
          if (equipmentData.attributes) {
            if (Array.isArray(equipmentData.attributes)) {
              equipmentData.attributes.forEach((attr: any) => {
                attributes[attr.key] = attr.value;
              });
            } else if (typeof equipmentData.attributes === 'object') {
              attributes = { ...equipmentData.attributes };
            }
          }
          
          if (equipmentData.specifications) {
            if (Array.isArray(equipmentData.specifications)) {
              equipmentData.specifications.forEach((spec: any) => {
                specifications[spec.key] = spec.value;
              });
            } else if (typeof equipmentData.specifications === 'object') {
              specifications = { ...equipmentData.specifications };
            }
          } else if (equipmentData.variants && typeof equipmentData.variants === 'object') {
            specifications = { ...equipmentData.variants };
          }
          
          return [{
            title: equipmentData.title,
            purchasePrice: Number(equipmentData.purchasePrice) || 0,
            quantity: Number(equipmentData.quantity) || 1,
            margin: Number(equipmentData.margin) || 0,
            monthlyPayment: Number(equipmentData.monthlyPayment) || 0,
            attributes,
            specifications
          }];
        }
      }
      
      // If the format is not recognized, treat as a single item with all content
      console.log("Format not recognized, returning generic item");
      return [{
        title: 'Description équipement',
        quantity: 1,
        monthlyPayment: 0,
        purchasePrice: 0,
        margin: 0,
        attributes: {},
        specifications: {}
      }];
    } catch (e) {
      console.error("Error parsing equipment description:", e);
      // If not valid JSON, treat as a text string
      return [{
        title: description,
        quantity: 1,
        monthlyPayment: 0,
        purchasePrice: 0,
        margin: 0,
        attributes: {},
        specifications: {}
      }];
    }
  };

  return {
    offer,
    setOffer,
    loading,
    error,
    signed,
    setSigned,
    debugInfo
  };
};
