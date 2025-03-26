
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  getOfferForClient, 
  isOfferSigned,
  saveOfferSignature
} from "@/services/offers/offerSignature";
import { generateAndDownloadOfferPdf } from "@/services/offerService";

export const useClientOffer = (offerId: string | undefined) => {
  const [offer, setOffer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signerName, setSignerName] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [signed, setSigned] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);
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
        
        try {
          setDebugInfo(prev => `${prev}\nRécupération des données d'offre...`);
          const offerData = await getOfferForClient(offerId);
          
          if (!offerData) {
            setError("Cette offre n'existe pas ou n'est plus disponible.");
            setDebugInfo(prev => `${prev}\nAucune donnée d'offre reçue`);
            setLoading(false);
            return;
          }
          
          setDebugInfo(prev => `${prev}\nDonnées d'offre reçues. ID: ${offerData.id}, Status: ${offerData.workflow_status}`);
          console.log("Données d'offre complètes:", offerData);
          
          setOffer(offerData);
          
          if (offerData.client_name) {
            setSignerName(offerData.client_name);
          }
          
          if (offerData.signature_data) {
            setSignature(offerData.signature_data);
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

  const handleSignature = async (signatureData: string) => {
    if (!offerId || !signerName.trim()) {
      toast.error("Veuillez indiquer votre nom complet avant de signer.");
      return;
    }
    
    try {
      setIsSigning(true);
      setSignature(signatureData);
      
      console.log("Tentative d'enregistrement de la signature pour l'offre:", offerId);
      const success = await saveOfferSignature(offerId, signatureData, signerName);
      
      if (success) {
        setSigned(true);
        toast.success("Offre signée avec succès !");
        
        setOffer({
          ...offer,
          signature_data: signatureData,
          signer_name: signerName,
          signed_at: new Date().toISOString(),
          workflow_status: 'approved'
        });
        
        setTimeout(() => {
          handlePrintPdf();
        }, 1500);
        
        console.log("Signature enregistrée avec succès");
      } else {
        console.error("Échec de l'enregistrement de la signature");
        toast.error("Erreur lors de l'enregistrement de la signature.");
      }
    } catch (err) {
      console.error("Erreur lors de la signature:", err);
      toast.error("Une erreur s'est produite lors de la signature.");
    } finally {
      setIsSigning(false);
    }
  };
  
  const handlePrintPdf = async () => {
    if (!offerId) return;
    
    try {
      setIsPrintingPdf(true);
      console.log("Génération du PDF pour l'offre:", offerId);
      await generateAndDownloadOfferPdf(offerId);
    } catch (err) {
      console.error("Erreur lors de la génération du PDF:", err);
      toast.error("Une erreur s'est produite lors de la génération du PDF.");
    } finally {
      setIsPrintingPdf(false);
    }
  };

  return {
    offer,
    loading,
    error,
    signerName,
    setSignerName,
    isSigning,
    signed,
    signature,
    isPrintingPdf,
    debugInfo,
    handleSignature,
    handlePrintPdf
  };
};
