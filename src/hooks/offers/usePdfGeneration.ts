
import { useState } from "react";
import { toast } from "sonner";
import { generateAndDownloadOfferPdf } from "@/services/offers/offerPdf";

export const usePdfGeneration = (offerId: string | undefined) => {
  const [isPrintingPdf, setIsPrintingPdf] = useState(false);

  const handlePrintPdf = async (): Promise<void> => {
    if (!offerId) {
      toast.error("Identifiant d'offre manquant pour la génération du PDF");
      return;
    }

    try {
      setIsPrintingPdf(true);
      console.log("Début du processus de génération de PDF pour l'offre:", offerId);
      
      const pdfFilename = await generateAndDownloadOfferPdf(offerId);
      
      if (pdfFilename) {
        console.log("PDF généré avec succès:", pdfFilename);
        toast.success("Le PDF a été généré et téléchargé avec succès");
      } else {
        console.error("Échec de génération du PDF - aucun nom de fichier retourné");
        toast.error("Erreur lors de la génération du PDF");
      }
    } catch (error) {
      console.error("Erreur lors de la génération du PDF:", error);
      toast.error("Une erreur s'est produite lors de la génération du PDF");
    } finally {
      setIsPrintingPdf(false);
    }
  };

  return {
    isPrintingPdf,
    handlePrintPdf
  };
};
