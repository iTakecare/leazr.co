
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createOffer } from "@/services/offers";
import { calculateFinancedAmount, calculateCommissionByLevel } from "@/utils/calculator";
import { Equipment, GlobalMarginAdjustment } from "@/types/equipment";
import { Client } from "@/types/client";

interface AmbassadorOfferSaveLogicProps {
  client: Client | null;
  equipmentList: Equipment[];
  globalMarginAdjustment: GlobalMarginAdjustment;
  coefficient: number;
  remarks: string;
  ambassadorId?: string;
  ambassador: any;
  userId?: string;
  setIsSubmitting: (value: boolean) => void;
}

export const useAmbassadorOfferSave = ({
  client,
  equipmentList,
  globalMarginAdjustment,
  coefficient,
  remarks,
  ambassadorId,
  ambassador,
  userId,
  setIsSubmitting
}: AmbassadorOfferSaveLogicProps) => {
  const navigate = useNavigate();

  const handleSaveOffer = async () => {
    if (!client) {
      toast.error("Veuillez d'abord sélectionner un client");
      return;
    }
    
    if (equipmentList.length === 0) {
      toast.error("Veuillez ajouter au moins un équipement");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const totalMonthlyPayment = equipmentList.reduce(
        (sum, item) => sum + ((item.monthlyPayment || 0) * item.quantity),
        0
      );
      
      const totalPurchasePrice = equipmentList.reduce(
        (sum, item) => sum + (item.purchasePrice * item.quantity),
        0
      );
      
      const equipmentDescription = JSON.stringify(
        equipmentList.map(eq => ({
          id: eq.id,
          title: eq.title,
          purchasePrice: eq.purchasePrice,
          quantity: eq.quantity,
          margin: eq.margin,
          monthlyPayment: eq.monthlyPayment || totalMonthlyPayment / equipmentList.length
        }))
      );
      
      const currentCoefficient = coefficient || globalMarginAdjustment.newCoef || 3.27;
      const financedAmount = calculateFinancedAmount(totalMonthlyPayment, currentCoefficient);
      
      // Variable pour stocker la commission
      let commissionAmount = 0;
      
      // Récupérer la commission depuis l'interface utilisateur
      const commissionElement = document.getElementById('commission-display-value');
      
      console.log("Commission element found:", commissionElement);
      
      if (commissionElement && commissionElement.dataset.commissionAmount) {
        try {
          commissionAmount = parseFloat(commissionElement.dataset.commissionAmount);
          if (!isNaN(commissionAmount)) {
            console.log("Commission récupérée depuis l'interface:", commissionAmount);
          } else {
            throw new Error("Commission is NaN");
          }
        } catch (error) {
          console.error("Error parsing commission from UI:", error);
          
          // Méthode de secours : calculer la commission
          const currentAmbassadorId = ambassadorId || userId;
          const commissionLevelId = ambassador?.commission_level_id;
          
          if (currentAmbassadorId && commissionLevelId) {
            try {
              const commissionData = await calculateCommissionByLevel(
                financedAmount,
                commissionLevelId,
                'ambassador',
                currentAmbassadorId
              );
              
              if (commissionData && typeof commissionData.amount === 'number') {
                commissionAmount = commissionData.amount;
                console.log(`Commission calculée pour l'offre: ${commissionAmount}€ (${commissionData.rate}%)`);
              } else {
                console.error("Erreur: le calcul de commission a retourné un objet invalide", commissionData);
                commissionAmount = Math.round(financedAmount * 0.05); // 5% par défaut, arrondi
              }
            } catch (commError) {
              console.error("Erreur lors du calcul de la commission:", commError);
              commissionAmount = Math.round(financedAmount * 0.05); // 5% par défaut, arrondi
            }
          } else {
            console.log("Impossible de calculer la commission précise: données d'ambassadeur manquantes");
            commissionAmount = Math.round(financedAmount * 0.05); // 5% par défaut, arrondi
          }
        }
      } else {
        // Fallback si l'élément n'existe pas
        console.warn("Commission element not found in DOM");
        commissionAmount = Math.round(financedAmount * 0.05); // 5% par défaut pour les ambassadeurs, arrondi
        console.log("Commission par défaut calculée (élément non trouvé):", commissionAmount);
      }
      
      const currentAmbassadorId = ambassadorId || userId;
      
      // On s'assure que la commission n'est pas invalide
      if (commissionAmount === 0 || isNaN(commissionAmount)) {
        console.warn("Commission invalide ou nulle, application d'une valeur par défaut");
        commissionAmount = Math.round(financedAmount * 0.05); // 5% par défaut, arrondi
      }
      
      // Log final de la commission à sauvegarder
      console.log("COMMISSION FINALE À SAUVEGARDER (AMBASSADOR):", commissionAmount);
      
      // Convertir le montant de total_margin_with_difference en chaîne de caractères
      const totalMarginWithDifferenceString = String(globalMarginAdjustment.marginDifference || 0);
      
      // Récupérer la marge totale générée (sans la différence)
      const marginAmount = String(globalMarginAdjustment.amount || 0);
      
      const offerData = {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        equipment_description: equipmentDescription,
        amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: commissionAmount,
        financed_amount: financedAmount,
        workflow_status: "draft",
        type: "ambassador_offer",
        user_id: userId || "",
        ambassador_id: currentAmbassadorId,
        remarks: remarks,
        total_margin_with_difference: totalMarginWithDifferenceString,
        margin: marginAmount
      };
      
      console.log("Saving offer with the following data:", offerData);
      console.log("Commission value being saved:", commissionAmount);
      console.log("Total margin with difference value being saved:", totalMarginWithDifferenceString);
      console.log("Margin generated value being saved:", marginAmount);
      
      const { data, error } = await createOffer(offerData);
      
      if (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        toast.error(`Impossible de sauvegarder l'offre: ${error.message || 'Erreur inconnue'}`);
        return;
      }
      
      toast.success("Offre créée avec succès!");
      
      navigate("/ambassador/offers");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'offre:", error);
      toast.error("Impossible de sauvegarder l'offre");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSaveOffer };
};
