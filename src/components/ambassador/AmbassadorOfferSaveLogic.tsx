
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createOffer } from "@/services/offers";
import { calculateFinancedAmount } from "@/utils/calculator";
import { Equipment, GlobalMarginAdjustment } from "@/types/equipment";
import { Client } from "@/types/client";
import { useOfferCommissionCalculator } from "@/hooks/useOfferCommissionCalculator";

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
  totalMargin = 0
}: AmbassadorOfferSaveLogicProps) => {
  const navigate = useNavigate();

  // Calcul de commission unifié pour les offres ambassadeur
  const commissionData = useOfferCommissionCalculator({
    isInternalOffer: false, // Les offres ambassadeur ne sont jamais internes
    selectedAmbassadorId: ambassadorId,
    commissionLevelId: ambassador?.commission_level_id,
    totalMargin,
    equipmentListLength: equipmentList.length,
    totalMonthlyPayment
  });

  const handleSaveOffer = async () => {
    if (!client) {
      toast.error("Veuillez d'abord sélectionner un client");
      return;
    }
    
    if (equipmentList.length === 0) {
      toast.error("Veuillez ajouter au moins un équipement");
      return;
    }
    
    if (!ambassadorId || !userId) {
      toast.error("Informations utilisateur manquantes");
      return;
    }

    // Vérifier que l'ambassadeur a un company_id
    if (!ambassador?.company_id) {
      console.error("❌ ERREUR - Ambassador sans company_id:", ambassador);
      toast.error("Erreur: L'ambassadeur n'a pas de company_id assigné");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Create equipment description with attributes for backward compatibility
      const equipmentDescription = JSON.stringify(
        equipmentList.map(eq => ({
          id: eq.id,
          title: eq.title,
          purchasePrice: eq.purchasePrice,
          quantity: eq.quantity,
          margin: eq.margin,
          monthlyPayment: eq.monthlyPayment || totalMonthlyPayment / equipmentList.length,
          attributes: eq.attributes || {} // Include attributes in JSON
        }))
      );
      
      const currentCoefficient = coefficient || globalMarginAdjustment.newCoef || 3.27;
      const financedAmount = calculateFinancedAmount(totalMonthlyPayment, currentCoefficient);
      
      // Utiliser la commission calculée par le hook unifié
      const calculatedCommission = commissionData.amount;
      
      console.log("🔍 AmbassadorOfferSaveLogic - Commission Debug:", {
        ambassadorId,
        commissionLevelId: ambassador?.commission_level_id,
        totalMargin,
        equipmentListLength: equipmentList.length,
        totalMonthlyPayment,
        calculatedCommission,
        commissionData
      });

      // Convertir le montant de total_margin_with_difference en number au lieu de string
      const totalMarginWithDifference = globalMarginAdjustment.marginDifference || 0;
      
      // Récupérer la marge totale générée (sans la différence)
      const marginAmount = globalMarginAdjustment.amount || 0;
      
      console.log("💾 AmbassadorOfferSaveLogic - Company ID Debug:", {
        ambassadorId,
        ambassadorName: ambassador?.name,
        ambassadorCompanyId: ambassador?.company_id,
        clientId: client.id,
        clientName: client.name
      });
      
      const offerData = {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email,
        equipment_description: equipmentDescription,
        amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: calculatedCommission, // Utiliser la commission calculée uniformément
        financed_amount: financedAmount,
        workflow_status: "draft",
        type: "ambassador_offer",
        user_id: userId,
        ambassador_id: ambassadorId,
        company_id: ambassador.company_id, // CORRECTION: Ajouter le company_id de l'ambassadeur
        remarks: remarks,
        total_margin_with_difference: totalMarginWithDifference,
        margin: marginAmount
      };
      
      console.log("💾 AmbassadorOfferSaveLogic - Saving offer with data:", offerData);
      console.log("💾 AmbassadorOfferSaveLogic - Commission value being saved:", calculatedCommission);
      console.log("💾 AmbassadorOfferSaveLogic - Ambassador:", ambassador?.name);
      console.log("💾 AmbassadorOfferSaveLogic - Company ID being saved:", ambassador.company_id);
      
      const { data, error } = await createOffer(offerData);
      
      if (error) {
        console.error("Erreur lors de la sauvegarde:", error);
        toast.error(`Impossible de sauvegarder l'offre: ${error.message || 'Erreur inconnue'}`);
        return;
      }
      
      // Save each equipment individually with attributes using the offer equipment service
      if (data && data.id) {
        console.log("Saving individual equipment items for offer:", data.id);
        
        for (const equipmentItem of equipmentList) {
          try {
            const { saveEquipment } = await import('@/services/offerService');
            const savedEquipment = await saveEquipment(
              {
                offer_id: data.id,
                title: equipmentItem.title,
                purchase_price: equipmentItem.purchasePrice,
                quantity: equipmentItem.quantity,
                margin: equipmentItem.margin,
                monthly_payment: equipmentItem.monthlyPayment || 0,
                serial_number: null
              },
              equipmentItem.attributes || {}, // Save attributes
              {} // Specifications (empty for now)
            );
            
            if (savedEquipment) {
              console.log("Equipment saved successfully:", savedEquipment.id);
            } else {
              console.error("Failed to save equipment:", equipmentItem.title);
            }
          } catch (equipmentError) {
            console.error("Error saving equipment:", equipmentItem.title, equipmentError);
            // Continue with other equipment even if one fails
          }
        }
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

  return { 
    handleSaveOffer,
    commissionData // Exposer les données de commission pour debug/affichage
  };
};
