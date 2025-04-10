
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { saveOfferSignature } from "@/services/offers/offerSignature";

export const useSignature = (
  offerId: string | undefined, 
  offer: any, 
  setSigned: (signed: boolean) => void,
  setOffer: (offer: any) => void,
  handlePrintPdf: () => Promise<void>
) => {
  const [signerName, setSignerName] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  // Initialiser le nom du signataire si disponible dans l'offre
  useEffect(() => {
    if (offer?.client_name) {
      setSignerName(offer.client_name);
    }
    if (offer?.signature_data) {
      setSignature(offer.signature_data);
    }
  }, [offer]);

  const handleSignature = async (signatureData: string) => {
    if (!offerId || !signerName.trim()) {
      toast.error("Veuillez indiquer votre nom complet avant de signer.");
      return;
    }
    
    // Vérification simple pour s'assurer que la signature n'est pas vide ou juste un fond blanc
    if (!signatureData || signatureData.length < 1000) {
      console.error("Données de signature potentiellement invalides:", 
        signatureData ? `Longueur: ${signatureData.length}` : "Signature vide");
      toast.error("La signature semble vide. Veuillez signer dans le cadre prévu.");
      return;
    }
    
    try {
      setIsSigning(true);
      setSignature(signatureData);
      
      console.log("Tentative d'enregistrement de la signature pour l'offre:", offerId);
      console.log("Données de signature reçues:", 
        signatureData ? `Longueur: ${signatureData.length} caractères` : "NON (données vides)");
      
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
        
        // Générer automatiquement le PDF après la signature
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

  return {
    signerName,
    setSignerName,
    isSigning,
    signature,
    handleSignature
  };
};
