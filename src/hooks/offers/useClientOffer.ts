
import { useLoadClientOffer } from "./useLoadClientOffer";
import { useSignature } from "./useSignature";

export const useClientOffer = (offerId: string | undefined) => {
  // Load offer data
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
    handleSignature
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
    handleSignature
  };
};
