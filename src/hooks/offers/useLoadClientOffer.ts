
import { useState, useEffect } from "react";
import { getOfferForClient, isOfferSigned } from "@/services/offers/offerSignature";

export const useLoadClientOffer = (offerId: string | undefined) => {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signed, setSigned] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);

  useEffect(() => {
    const fetchOffer = async () => {
      if (!offerId) {
        setError("Identifiant d'offre manquant");
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        setDebugInfo(`Tentative de chargement de l'offre: ${offerId}`);
        
        // Vérifier si l'offre est déjà signée
        let alreadySigned = false;
        try {
          alreadySigned = await isOfferSigned(offerId);
          if (alreadySigned) {
            setSigned(true);
            setDebugInfo(prev => `${prev}\nOffre déjà signée`);
          }
        } catch (signedErr) {
          console.error("Erreur lors de la vérification de signature:", signedErr);
          setDebugInfo(prev => `${prev}\nErreur vérification signature: ${JSON.stringify(signedErr)}`);
        }
        
        // Récupérer les données de l'offre
        try {
          setDebugInfo(prev => `${prev}\nRécupération des données d'offre...`);
          const offerData = await getOfferForClient(offerId);
          
          if (!offerData) {
            setError("Cette offre n'existe pas ou n'est plus disponible.");
            setDebugInfo(prev => `${prev}\nAucune donnée d'offre reçue`);
            setLoading(false);
            return;
          }
          
          setDebugInfo(prev => `${prev}\nDonnées d'offre reçues. ID: ${offerData.id}, Status: ${offerData.workflow_status || 'draft'}`);
          console.log("Données d'offre complètes:", offerData);
          
          setOffer(offerData);
          
          // Vérifier si l'offre est approuvée ou contient une signature
          if (offerData.signature_data) {
            setSigned(true);
            setDebugInfo(prev => `${prev}\nOffre contient déjà une signature`);
          }
          
          if (offerData.workflow_status === 'approved' && !offerData.signature_data) {
            setSigned(true);
            setDebugInfo(prev => `${prev}\nOffre marquée comme approuvée sans signature`);
          }
        } catch (dataErr: any) {
          console.error("Erreur détaillée lors de la récupération des données:", dataErr);
          setError(dataErr?.message || "Impossible de récupérer les détails de cette offre.");
          setDebugInfo(prev => `${prev}\nErreur récupération données: ${JSON.stringify(dataErr)}`);
        }
      } catch (err: any) {
        console.error("Erreur générale lors du chargement de l'offre:", err);
        setError(err?.message || "Une erreur s'est produite lors du chargement de l'offre.");
        setDebugInfo(prev => `${prev}\nErreur générale: ${JSON.stringify(err)}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOffer();
  }, [offerId]);

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
