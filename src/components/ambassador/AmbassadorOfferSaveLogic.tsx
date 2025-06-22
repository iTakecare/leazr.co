
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
    
    // Validation des IDs obligatoires
    if (!client.id) {
      toast.error("ID client manquant");
      return;
    }
    
    // Améliorer la logique de récupération de l'ID ambassadeur
    const currentAmbassadorId = ambassadorId || userId || ambassador?.id;
    console.log("🔍 DIAGNOSTIC - IDs disponibles:", {
      ambassadorId,
      userId,
      ambassadorFromObject: ambassador?.id,
      currentAmbassadorId
    });
    
    if (!currentAmbassadorId) {
      console.error("🔍 DIAGNOSTIC - Aucun ID ambassadeur trouvé");
      toast.error("ID ambassadeur manquant. Veuillez vous reconnecter.");
      return;
    }
    
    if (!userId) {
      toast.error("Utilisateur non authentifié");
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
      
      // Récupérer la commission depuis le composant SimpleCommissionDisplay
      let commissionAmount = 0;
      
      const commissionElement = document.getElementById('ambassador-commission-value');
      
      if (commissionElement && commissionElement.dataset.commissionAmount) {
        try {
          commissionAmount = parseFloat(commissionElement.dataset.commissionAmount);
          console.log("Commission récupérée depuis SimpleCommissionDisplay:", commissionAmount);
        } catch (error) {
          console.error("Error parsing commission:", error);
          // Fallback: calcul simple 5% du montant financé
          commissionAmount = Math.round(financedAmount * 0.05);
          console.log("Fallback commission appliquée:", commissionAmount);
        }
      } else {
        // Fallback: calcul simple 5% du montant financé
        commissionAmount = Math.round(financedAmount * 0.05);
        console.log("Commission par défaut appliquée (élément non trouvé):", commissionAmount);
      }
      
      // Validation finale de la commission
      if (commissionAmount === 0 || isNaN(commissionAmount)) {
        commissionAmount = Math.round(financedAmount * 0.05);
        console.log("Commission finale (validation échouée):", commissionAmount);
      }
      
      console.log("COMMISSION FINALE À SAUVEGARDER:", {
        commissionAmount,
        financedAmount,
        totalMonthlyPayment,
        ambassadorId: currentAmbassadorId,
        ambassador: ambassador?.name || 'Unknown'
      });
      
      const totalMarginWithDifferenceString = String(globalMarginAdjustment.marginDifference || 0);
      const marginAmount = String(globalMarginAdjustment.amount || 0);
      
      const offerData = {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email || "",
        equipment_description: equipmentDescription,
        amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: commissionAmount,
        financed_amount: financedAmount,
        workflow_status: "draft",
        type: "ambassador_offer",
        user_id: userId,
        ambassador_id: currentAmbassadorId,
        remarks: remarks,
        total_margin_with_difference: totalMarginWithDifferenceString,
        margin: marginAmount
      };
      
      console.log("🔍 DIAGNOSTIC - Données d'offre à sauvegarder:", offerData);
      
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
