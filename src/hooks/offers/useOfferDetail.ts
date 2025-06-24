
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
      const parsedEquipment = equipmentData.map(item => ({
        id: item.id,
        title: item.title,
        purchasePrice: item.purchase_price,
        quantity: item.quantity,
        margin: item.margin,
        monthlyPayment: item.monthly_payment,
        serialNumber: item.serial_number,
        // Convert attributes array to object
        attributes: item.attributes ? 
          item.attributes.reduce((acc, attr) => {
            acc[attr.key] = attr.value;
            return acc;
          }, {} as Record<string, string>) : {},
        // Convert specifications array to object
        specifications: item.specifications ? 
          item.specifications.reduce((acc, spec) => {
            acc[spec.key] = spec.value;
            return acc;
          }, {} as Record<string, string>) : {}
      }));
      
      // Set the offer with parsed equipment
      setOffer({
        ...offerData,
        parsedEquipment
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
