
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createOffer } from "@/services/offers";
import { calculateFinancedAmount } from "@/utils/calculator";
import { Equipment, GlobalMarginAdjustment } from "@/types/equipment";
import { Client } from "@/types/client";
import { useCommissionCalculator } from "@/hooks/useCommissionCalculator";

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
  totalMonthlyPayment: number;
  totalMargin?: number;
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
  setIsSubmitting,
  totalMonthlyPayment,
  totalMargin
}: AmbassadorOfferSaveLogicProps) => {
  const navigate = useNavigate();

  // Utiliser le hook de calcul de commission pour obtenir la commission correcte
  const commission = useCommissionCalculator(
    totalMonthlyPayment,
    ambassadorId,
    ambassador?.commission_level_id,
    equipmentList.length,
    totalMargin
  );

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
    
    const currentAmbassadorId = ambassadorId || userId;
    if (!currentAmbassadorId) {
      toast.error("ID ambassadeur manquant");
      return;
    }
    
    if (!userId) {
      toast.error("Utilisateur non authentifié");
      return;
    }

    // Récupérer le company_id de l'ambassadeur
    const ambassadorCompanyId = ambassador?.company_id;
    if (!ambassadorCompanyId) {
      toast.error("Company ID manquant pour l'ambassadeur");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
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
      
      // Utiliser la commission calculée par le hook
      const commissionAmount = commission.amount || 0;
      
      console.log("COMMISSION FINALE À SAUVEGARDER:", {
        commissionAmount,
        commissionFromHook: commission,
        financedAmount,
        totalMonthlyPayment,
        totalMargin,
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
        company_id: ambassadorCompanyId,
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
