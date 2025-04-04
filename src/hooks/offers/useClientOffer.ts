
import { useLoadClientOffer } from "./useLoadClientOffer";
import { useSignature } from "./useSignature";
import { usePdfGeneration } from "./usePdfGeneration";

export const useClientOffer = (offerId: string | undefined) => {
  // Charger les données de l'offre
  const {
    offer,
    setOffer,
    loading,
    error,
    signed,
    setSigned,
    debugInfo
  } = useLoadClientOffer(offerId);

  // Vérifier si c'est une offre interne (sans commission)
  const isInternalOffer = offer?.type === 'internal_offer';

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
    handleSignature
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
    isInternalOffer,
    handleSignature,
    handlePrintPdf
  };
};
