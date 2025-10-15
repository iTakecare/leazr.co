
import { useLoadClientOffer } from "./useLoadClientOffer";
import { useSignature } from "./useSignature";
import { usePdfGeneration } from "./usePdfGeneration";

export const useClientOffer = (offerId: string | undefined) => {
  // Charger les données de l'offre
  const {
    offer,
    loading,
    error,
    signed,
    setSigned,
    debugInfo,
    setOffer
  } = useLoadClientOffer(offerId);

  // Gérer la génération de PDF
  const {
    isPrintingPdf,
    handlePrintPdf
  } = usePdfGeneration(offerId);

  // Gérer la signature
  const {
    signerName,
    setSignerName,
    isSigning,
    signature,
    handleSignature,
    clientIp
  } = useSignature(offerId, offer, setSigned, setOffer, handlePrintPdf);

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
    handlePrintPdf,
    clientIp
  };
};
