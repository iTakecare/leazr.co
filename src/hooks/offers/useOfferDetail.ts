
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
      setLoading(true);
      setError(null);
      
      console.log("useOfferDetail - Fetching offer:", offerId);
      
      // Fetch the main offer data
      const offerData = await getOfferById(offerId);
      
      if (!offerData) {
        setError("Offre non trouvée");
        return;
      }
      
      console.log("useOfferDetail - Offer data received:", offerData);
      
      // Fetch equipment from the new structure
      const equipmentData = await getOfferEquipment(offerId);
      console.log("useOfferDetail - Equipment data received:", equipmentData);
      
      // Convert equipment data to the expected format for compatibility
      const parsedEquipment = equipmentData.map(item => {
        // Convertir les attributs depuis le format array vers object pour compatibilité
        const attributesObject: Record<string, string> = {};
        if (item.attributes && item.attributes.length > 0) {
          item.attributes.forEach(attr => {
            attributesObject[attr.key] = attr.value;
          });
        }
        
        // Convertir les spécifications depuis le format array vers object pour compatibilité
        const specificationsObject: Record<string, string> = {};
        if (item.specifications && item.specifications.length > 0) {
          item.specifications.forEach(spec => {
            specificationsObject[spec.key] = spec.value;
          });
        }
        
        return {
          id: item.id,
          title: item.title,
          purchasePrice: item.purchase_price,
          quantity: item.quantity,
          margin: item.margin,
          monthlyPayment: item.monthly_payment,
          serialNumber: item.serial_number,
          // Garder les deux formats pour la compatibilité
          attributes: attributesObject, // Format objet pour compatibilité existante
          attributesArray: item.attributes, // Format array original de la DB
          specifications: specificationsObject, // Format objet pour compatibilité existante  
          specificationsArray: item.specifications // Format array original de la DB
        };
      });
      
      // Set the offer with parsed equipment
      setOffer({
        ...offerData,
        parsedEquipment,
        equipmentItems: parsedEquipment // Alias pour EquipmentInfoCard
      });
      
    } catch (err) {
      console.error("useOfferDetail - Error fetching offer:", err);
      setError("Erreur lors du chargement de l'offre");
    } finally {
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
