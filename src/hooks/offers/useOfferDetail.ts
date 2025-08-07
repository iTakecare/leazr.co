
import { useState, useEffect } from "react";
import { getOfferById } from "@/services/offerService";
import { getOfferEquipment } from "@/services/offers/offerEquipment";

export const useOfferDetail = (offerId: string) => {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffer = async () => {
    if (!offerId) return;
    
    try {
      console.log("🔄 useOfferDetail - DÉBUT - Fetching offer:", offerId);
      setLoading(true);
      setError(null);
      
      // Step 1: Fetch the main offer data
      console.log("🔄 useOfferDetail - ÉTAPE 1 - Récupération données offre de base");
      const offerData = await getOfferById(offerId);
      
      if (!offerData) {
        console.error("❌ useOfferDetail - ERREUR - Aucune donnée d'offre trouvée");
        setError("Offre non trouvée");
        return;
      }
      
      console.log("✅ useOfferDetail - ÉTAPE 1 RÉUSSIE - Offer data received:", offerData);
      console.log("💰 useOfferDetail - Offer margin from DB:", offerData.margin);
      
      // Step 2: Try to fetch equipment with error isolation
      console.log("🔄 useOfferDetail - ÉTAPE 2 - Récupération équipements");
      let equipmentData = [];
      let equipmentError = null;
      
      try {
        equipmentData = await getOfferEquipment(offerId);
        console.log("✅ useOfferDetail - ÉTAPE 2 RÉUSSIE - Equipment data received:", equipmentData);
      } catch (equipmentErr) {
        console.error("⚠️ useOfferDetail - ERREUR ÉQUIPEMENTS (non bloquante):", equipmentErr);
        equipmentError = equipmentErr;
        // On continue même si les équipements ne se chargent pas
      }
      
      // Step 3: Process equipment data with error handling
      console.log("🔄 useOfferDetail - ÉTAPE 3 - Traitement des équipements");
      let parsedEquipment = [];
      
      try {
        if (equipmentData && equipmentData.length > 0) {
          parsedEquipment = equipmentData.map((item, index) => {
            try {
              console.log(`🔧 useOfferDetail - Processing equipment ${index + 1}/${equipmentData.length}:`, item.title);
              
              // Convertir les attributs avec gestion d'erreur
              const attributesObject: Record<string, string> = {};
              try {
                if (item.attributes && Array.isArray(item.attributes) && item.attributes.length > 0) {
                  item.attributes.forEach(attr => {
                    if (attr && attr.key && attr.value) {
                      attributesObject[attr.key] = attr.value;
                    }
                  });
                }
              } catch (attrErr) {
                console.warn(`⚠️ useOfferDetail - Erreur traitement attributs pour ${item.title}:`, attrErr);
              }
              
              // Convertir les spécifications avec gestion d'erreur
              const specificationsObject: Record<string, string> = {};
              try {
                if (item.specifications && Array.isArray(item.specifications) && item.specifications.length > 0) {
                  item.specifications.forEach(spec => {
                    if (spec && spec.key && spec.value) {
                      specificationsObject[spec.key] = spec.value;
                    }
                  });
                }
              } catch (specErr) {
                console.warn(`⚠️ useOfferDetail - Erreur traitement spécifications pour ${item.title}:`, specErr);
              }
              
              return {
                id: item.id,
                title: item.title || 'Équipement sans nom',
                purchasePrice: item.purchase_price || 0,
                quantity: item.quantity || 1,
                margin: item.margin || 0,
                monthlyPayment: item.monthly_payment || 0,
                serialNumber: item.serial_number || '',
                // Garder les deux formats pour la compatibilité
                attributes: attributesObject,
                attributesArray: item.attributes || [],
                specifications: specificationsObject,
                specificationsArray: item.specifications || []
              };
            } catch (itemErr) {
              console.error(`❌ useOfferDetail - Erreur traitement équipement ${index + 1}:`, itemErr);
              // Retourner un objet minimal en cas d'erreur
              return {
                id: item.id || `error-${index}`,
                title: `Équipement ${index + 1} (erreur de traitement)`,
                purchasePrice: 0,
                quantity: 1,
                margin: 0,
                monthlyPayment: 0,
                serialNumber: '',
                attributes: {},
                attributesArray: [],
                specifications: {},
                specificationsArray: []
              };
            }
          });
          console.log("✅ useOfferDetail - ÉTAPE 3 RÉUSSIE - Équipements traités:", parsedEquipment.length);
        } else {
          console.log("ℹ️ useOfferDetail - Aucun équipement dans la nouvelle table, tentative avec equipment_description");
        }
      } catch (processingErr) {
        console.error("❌ useOfferDetail - ERREUR TRAITEMENT ÉQUIPEMENTS:", processingErr);
        parsedEquipment = [];
      }
      
      // Step 4: Fallback to equipment_description if needed
      console.log("🔄 useOfferDetail - ÉTAPE 4 - Vérification fallback equipment_description");
      let finalEquipment = parsedEquipment;
      
      if (parsedEquipment.length === 0 && offerData.equipment_description) {
        try {
          console.log("🔄 useOfferDetail - Tentative parsing equipment_description JSON");
          const fallbackEquipment = JSON.parse(offerData.equipment_description);
          if (Array.isArray(fallbackEquipment)) {
            console.log("✅ useOfferDetail - Fallback equipment trouvé:", fallbackEquipment.length, "items");
            finalEquipment = fallbackEquipment.map(item => ({
              ...item,
              attributes: item.attributes || {},
              specifications: item.specifications || {}
            }));
          }
        } catch (jsonErr) {
          console.warn("⚠️ useOfferDetail - Impossible de parser equipment_description comme JSON:", jsonErr);
        }
      }
      
      // Step 5: Create final offer object
      console.log("🔄 useOfferDetail - ÉTAPE 5 - Création objet offre final");
      const finalOffer = {
        ...offerData,
        parsedEquipment: finalEquipment,
        equipmentItems: finalEquipment,
        offerMargin: offerData.margin || offerData.total_margin_with_difference || 0,
        // Ajouter des infos de debug
        _debug: {
          hasEquipment: finalEquipment.length > 0,
          equipmentCount: finalEquipment.length,
          equipmentError: equipmentError ? equipmentError.message : null,
          source: parsedEquipment.length > 0 ? 'database' : 'json_fallback'
        }
      };
      
      console.log("✅ useOfferDetail - ÉTAPE 5 RÉUSSIE - Objet offre créé:", {
        id: finalOffer.id,
        title: finalOffer.client_name,
        equipmentCount: finalOffer.parsedEquipment?.length || 0,
        margin: finalOffer.offerMargin
      });
      
      setOffer(finalOffer);
      console.log("🎉 useOfferDetail - SUCCÈS COMPLET - Offre chargée avec succès");
      
    } catch (err) {
      console.error("❌ useOfferDetail - ERREUR FATALE:", err);
      console.error("❌ useOfferDetail - Stack trace:", err instanceof Error ? err.stack : 'No stack trace');
      console.error("❌ useOfferDetail - Offer ID:", offerId);
      
      // Essayer de créer un objet minimal même en cas d'erreur
      try {
        console.log("🔄 useOfferDetail - Tentative de récupération basique");
        const basicOfferData = await getOfferById(offerId);
        if (basicOfferData) {
          console.log("✅ useOfferDetail - Récupération basique réussie");
          setOffer({
            ...basicOfferData,
            parsedEquipment: [],
            equipmentItems: [],
            offerMargin: basicOfferData.margin || 0,
            _error: "Erreur lors du chargement des équipements"
          });
          setError("Certaines données n'ont pas pu être chargées");
        } else {
          setError("Erreur lors du chargement de l'offre");
        }
      } catch (basicErr) {
        console.error("❌ useOfferDetail - Récupération basique échouée:", basicErr);
        setError("Erreur critique lors du chargement de l'offre");
      }
    } finally {
      console.log("🏁 useOfferDetail - FIN - setLoading(false)");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffer();
  }, [offerId]);

  return {
    offer,
    loading,
    error,
    fetchOffer
  };
};
