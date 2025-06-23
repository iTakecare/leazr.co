
import { useState, useEffect } from "react";
import { getOfferById } from "@/services/offers/getOffers";
import { isOfferSigned } from "@/services/offers/offerSignature";

export const useLoadClientOffer = (offerId: string | undefined) => {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

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
        
        // Check if offer is signed
        const isSignedStatus = isOfferSigned(offerData);
        setSigned(isSignedStatus);
        
        // Set debug info for troubleshooting
        setDebugInfo({
          offerId,
          offerFound: !!offerData,
          signatureData: !!offerData.signature_data,
          signedAt: offerData.signed_at,
          clientEmail: offerData.client_email
        });
        
      } catch (err) {
        console.error("❌ Error loading offer for client:", err);
        setError("Erreur lors du chargement de l'offre");
        setDebugInfo({
          offerId,
          error: err,
          offerFound: false
        });
      } finally {
        setLoading(false);
      }
    };

    loadOffer();
  }, [offerId]);

  return { 
    offer, 
    loading, 
    error, 
    signed, 
    setSigned, 
    debugInfo, 
    setOffer 
  };
};
