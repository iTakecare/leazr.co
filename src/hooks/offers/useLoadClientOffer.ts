
import { useState, useEffect } from "react";
import { getOfferForClient, isOfferSigned } from "@/services/offers/offerSignature";

export const useLoadClientOffer = (offerId: string | undefined) => {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    console.log("useLoadClientOffer - useEffect triggered with offerId:", offerId);
    
    const fetchOffer = async () => {
      if (!offerId) {
        console.log("useLoadClientOffer - No offerId provided");
        setError("Identifiant d'offre manquant");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        console.log("useLoadClientOffer - Starting to fetch offer:", offerId);
        setDebugInfo(`🔍 Tentative de chargement de l'offre: ${offerId}`);
        
        // Vérifier si l'offre est déjà signée
        let alreadySigned = false;
        try {
          console.log("useLoadClientOffer - Checking if offer is signed");
          alreadySigned = await isOfferSigned(offerId);
          if (alreadySigned) {
            setSigned(true);
            setDebugInfo(prev => `${prev}\n✅ Offre déjà signée`);
          }
          console.log("useLoadClientOffer - Offer signed status:", alreadySigned);
        } catch (signedErr) {
          console.error("useLoadClientOffer - Error checking signature:", signedErr);
          setDebugInfo(prev => `${prev}\n⚠️ Erreur vérification signature: ${JSON.stringify(signedErr)}`);
        }
        
        // Récupérer les données de l'offre
        try {
          setDebugInfo(prev => `${prev}\n🔄 Récupération des données d'offre...`);
          console.log("useLoadClientOffer - Fetching offer data");
          const offerData = await getOfferForClient(offerId);
          
          if (!offerData) {
            console.log("useLoadClientOffer - No offer data received");
            setError("Cette offre n'existe pas ou n'est plus disponible. Veuillez vérifier le lien ou contacter l'expéditeur.");
            setDebugInfo(prev => `${prev}\n❌ Aucune donnée d'offre reçue`);
            setLoading(false);
            return;
          }
          
          console.log("useLoadClientOffer - Offer data received:", offerData);
          setDebugInfo(prev => `${prev}\n✅ Données d'offre reçues. ID: ${offerData.id}, Status: ${offerData.workflow_status}`);
          
          setOffer(offerData);
          
          // Vérifier si l'offre est approuvée ou contient une signature
          if (offerData.signature_data) {
            setSigned(true);
            setDebugInfo(prev => `${prev}\n✅ Offre contient déjà une signature`);
          }
          
          if (offerData.workflow_status === 'approved' && !offerData.signature_data) {
            setSigned(true);
            setDebugInfo(prev => `${prev}\n✅ Offre marquée comme approuvée sans signature`);
          }
        } catch (dataErr: any) {
          console.error("useLoadClientOffer - Error fetching offer data:", dataErr);
          
          // Messages d'erreur plus spécifiques selon le type d'erreur
          let errorMessage = "Impossible de récupérer les détails de cette offre.";
          
          if (dataErr?.message?.includes("Aucune offre trouvée")) {
            errorMessage = "Cette offre n'existe pas ou a été supprimée. Veuillez vérifier le lien ou contacter l'expéditeur.";
          } else if (dataErr?.message?.includes("Permission denied") || dataErr?.message?.includes("violates row-level security")) {
            errorMessage = "Cette offre n'est pas encore disponible pour signature ou a expiré. Veuillez contacter l'expéditeur.";
          } else if (dataErr?.message?.includes("network") || dataErr?.message?.includes("connection")) {
            errorMessage = "Problème de connexion. Veuillez réessayer dans quelques instants.";
          }
          
          setError(errorMessage);
          setDebugInfo(prev => `${prev}\n❌ Erreur récupération données: ${dataErr?.message || JSON.stringify(dataErr)}`);
        }
      } catch (err: any) {
        console.error("useLoadClientOffer - General error:", err);
        setError("Une erreur inattendue s'est produite lors du chargement de l'offre. Veuillez réessayer ou contacter le support.");
        setDebugInfo(prev => `${prev}\n❌ Erreur générale: ${err?.message || JSON.stringify(err)}`);
      } finally {
        console.log("useLoadClientOffer - Setting loading to false");
        setLoading(false);
      }
    };
    
    fetchOffer();
  }, [offerId]);

  console.log("useLoadClientOffer - Returning state:", {
    hasOffer: !!offer,
    loading,
    error,
    signed
  });

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
