
import { useState, useEffect } from "react";
import { getOfferById } from "@/services/offers/getOffers";

export const useLoadClientOffer = (offerId: string | undefined) => {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOffer = async () => {
      if (!offerId) {
        setError("ID de l'offre manquant");
        setLoading(false);
        return;
      }

      try {
        console.log("📋 Loading offer for client ID:", offerId);
        const offerData = await getOfferById(offerId);
        
        if (!offerData) {
          setError("Offre non trouvée");
          setLoading(false);
          return;
        }

        console.log("✅ Offer loaded for client:", offerData);
        setOffer(offerData);
      } catch (err) {
        console.error("❌ Error loading offer for client:", err);
        setError("Erreur lors du chargement de l'offre");
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [offerId]);

  return { offer, loading, error };
};
