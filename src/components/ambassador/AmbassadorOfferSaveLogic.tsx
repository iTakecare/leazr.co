
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createOffer } from "@/services/offers";
import { calculateFinancedAmount } from "@/utils/calculator";
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
      
      // Récupérer la commission depuis le nouveau composant
      let commissionAmount = 0;
      
      const commissionElement = document.querySelector('[data-commission-amount]') as HTMLElement;
      
      if (commissionElement && commissionElement.dataset.commissionAmount) {
        try {
          commissionAmount = parseFloat(commissionElement.dataset.commissionAmount);
          console.log("Commission récupérée depuis le nouveau composant:", commissionAmount);
        } catch (error) {
          console.error("Error parsing commission:", error);
          // Fallback: 5% du montant financé
          commissionAmount = Math.round(financedAmount * 0.05);
        }
      } else {
        // Fallback si l'élément n'existe pas
        commissionAmount = Math.round(financedAmount * 0.05);
        console.log("Commission par défaut appliquée:", commissionAmount);
      }
      
      const currentAmbassadorId = ambassadorId || userId;
      
      // Validation finale de la commission
      if (commissionAmount === 0 || isNaN(commissionAmount)) {
        commissionAmount = Math.round(financedAmount * 0.05);
      }
      
      console.log("COMMISSION FINALE À SAUVEGARDER:", commissionAmount);
      
      const totalMarginWithDifferenceString = String(globalMarginAdjustment.marginDifference || 0);
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
      
      console.log("Saving offer with data:", offerData);
      
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
