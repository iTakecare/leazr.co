
import { useState } from "react";
import { toast } from "sonner";
import { generateAndDownloadOfferPdf } from "@/services/offers/offerPdf";

export const usePdfGeneration = (offerId: string | undefined) => {
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

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
    isPrintingPdf,
    handlePrintPdf
  };
};
