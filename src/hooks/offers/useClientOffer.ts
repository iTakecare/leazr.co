
import { useLoadClientOffer } from "./useLoadClientOffer";
import { useSignature } from "./useSignature";

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

  // Gérer la signature
  const {
    signerName,
    setSignerName,
    isSigning,
    signature,
    handleSignature,
    clientIp
  } = useSignature(offerId, offer, setSigned, setOffer, async () => {});

  return {
    offer,
    loading,
    error,
    signerName,
    setSignerName,
    isSigning,
    signed,
    signature,
    debugInfo,
    handleSignature,
    clientIp
  };
};
