
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
  const [approvalText, setApprovalText] = useState("");
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
    if (offer?.approval_text) {
      setApprovalText(offer.approval_text);
    }
  }, [offer]);

  const handleSignature = async (signatureData: string) => {
    if (!offerId) {
      toast.error("Identifiant d'offre manquant pour la signature");
      return;
    }
    
    if (!signerName.trim()) {
      toast.error("Veuillez indiquer votre nom complet avant de signer.");
      return;
    }
    
    // Vérifier que la mention "Bon pour accord" a été saisie correctement
    if (approvalText.trim().toLowerCase() !== "bon pour accord") {
      toast.error("Veuillez saisir la mention exacte 'Bon pour accord'.");
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
      
      const success = await saveOfferSignature(offerId, signatureData, signerName, approvalText);
      
      if (success) {
        // Mettre à jour l'état local et l'offre
        const now = new Date().toISOString();
        setSigned(true);
        
        const updatedOffer = {
          ...offer,
          signature_data: signatureData,
          signer_name: signerName,
          approval_text: approvalText,
          signed_at: now,
          workflow_status: 'approved'
        };
        
        setOffer(updatedOffer);
        toast.success("Offre signée avec succès !");
        
        console.log("Signature enregistrée avec succès, offre mise à jour:", updatedOffer.id);
        
        // Donner un peu de temps à l'interface pour se mettre à jour avant de générer le PDF
        setTimeout(async () => {
          try {
            console.log("Démarrage de la génération du PDF après signature");
            await handlePrintPdf();
          } catch (pdfError) {
            console.error("Erreur lors de la génération du PDF après signature:", pdfError);
            toast.error("La signature a été enregistrée mais une erreur est survenue lors de la génération du PDF.");
          }
        }, 1500);
      } else {
        console.error("Échec de l'enregistrement de la signature");
        toast.error("Erreur lors de l'enregistrement de la signature. Veuillez réessayer.");
        // Réinitialiser l'état de signature pour permettre une nouvelle tentative
        setSignature(null);
      }
    } catch (err) {
      console.error("Erreur lors de la signature:", err);
      toast.error("Une erreur s'est produite lors de la signature. Veuillez réessayer.");
      // Réinitialiser l'état de signature pour permettre une nouvelle tentative
      setSignature(null);
    } finally {
      setIsSigning(false);
    }
  };

  return {
    signerName,
    setSignerName,
    approvalText,
    setApprovalText,
    isSigning,
    signature,
    handleSignature
  };
};
