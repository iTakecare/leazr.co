
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createOffer } from "@/services/offers";
import { calculateFinancedAmount } from "@/utils/calculator";
import { Equipment, GlobalMarginAdjustment } from "@/types/equipment";
import { Client } from "@/types/client";
import { useOfferCommissionCalculator } from "@/hooks/useOfferCommissionCalculator";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";
import { supabase } from "@/integrations/supabase/client";

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
  selectedLeaser?: any;
  selectedDuration?: number;
  editId?: string;
  discountData?: {
    enabled: boolean;
    type: 'percentage' | 'amount';
    value: number;
    discountAmount: number;
    monthlyPaymentBeforeDiscount: number;
    monthlyPaymentAfterDiscount: number;
  };
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
  totalMargin = 0,
  selectedLeaser,
  selectedDuration = 36,
  editId,
  discountData
}: AmbassadorOfferSaveLogicProps) => {
  const navigate = useNavigate();
  const { navigateToAmbassador } = useRoleNavigation();
  
  const isEditMode = !!editId;

  // Calcul du prix d'achat total pour la commission
  const totalPurchaseAmount = equipmentList.reduce((sum, equipment) => 
    sum + (equipment.purchasePrice * equipment.quantity), 0);

  // Calcul de commission unifié pour les offres ambassadeur
  const commissionData = useOfferCommissionCalculator({
    isInternalOffer: false, // Les offres ambassadeur ne sont jamais internes
    selectedAmbassadorId: ambassadorId,
    commissionLevelId: ambassador?.commission_level_id,
    totalMargin,
    equipmentList: equipmentList.map(e => ({ product_id: e.id, title: e.title, quantity: e.quantity })),
    totalMonthlyPayment,
    totalPurchaseAmount
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
        commissionData,
        isEditMode,
        editId
      });

      // Convertir le montant de total_margin_with_difference en number au lieu de string
      const totalMarginWithDifference = globalMarginAdjustment.marginDifference || 0;
      
      // Récupérer la marge totale générée (sans la différence)
      const marginAmount = globalMarginAdjustment.amount || 0;
      
      const offerData = {
        client_id: client.id,
        client_name: client.name,
        client_email: client.email || null,
        amount: globalMarginAdjustment.amount + equipmentList.reduce((sum, eq) => sum + (eq.purchasePrice * eq.quantity), 0),
        coefficient: globalMarginAdjustment.newCoef,
        monthly_payment: totalMonthlyPayment,
        commission: calculatedCommission,
        financed_amount: financedAmount,
        workflow_status: "draft",
        type: "ambassador_offer",
        user_id: userId,
        ambassador_id: ambassadorId,
        company_id: ambassador.company_id,
        remarks: remarks,
        total_margin_with_difference: totalMarginWithDifference,
        margin: marginAmount,
        leaser_id: selectedLeaser?.id,
        duration: selectedDuration,
        discount_type: discountData?.enabled ? discountData.type : null,
        discount_value: discountData?.enabled ? discountData.value : null,
        discount_amount: discountData?.enabled ? discountData.discountAmount : null,
        monthly_payment_before_discount: discountData?.enabled ? discountData.monthlyPaymentBeforeDiscount : null,
      };
      
      let offerId: string;
      
      if (isEditMode && editId) {
        // MODE ÉDITION - Mettre à jour l'offre existante
        console.log("💾 AmbassadorOfferSaveLogic - UPDATING offer:", editId);
        
        const { error: updateError } = await supabase
          .from('offers')
          .update(offerData)
          .eq('id', editId);
        
        if (updateError) {
          console.error("Erreur lors de la mise à jour:", updateError);
          toast.error(`Impossible de mettre à jour l'offre: ${updateError.message || 'Erreur inconnue'}`);
          return;
        }
        
        offerId = editId;
        
        // Supprimer les anciens équipements avant de sauvegarder les nouveaux
        const { error: deleteError } = await supabase
          .from('offer_equipment')
          .delete()
          .eq('offer_id', editId);
        
        if (deleteError) {
          console.warn("⚠️ Erreur lors de la suppression des anciens équipements:", deleteError);
        }
        
      } else {
        // MODE CRÉATION - Créer une nouvelle offre
        console.log("💾 AmbassadorOfferSaveLogic - CREATING new offer");
        
        const { data, error } = await createOffer(offerData);
        
        if (error) {
          console.error("Erreur lors de la sauvegarde:", error);
          toast.error(`Impossible de sauvegarder l'offre: ${error.message || 'Erreur inconnue'}`);
          return;
        }
        
        offerId = data.id;
      }
      
      // Sauvegarder chaque équipement individuellement avec leurs attributs
      console.log("💾 AmbassadorOfferSaveLogic - Saving individual equipment items for offer:", offerId);
      
      for (const equipmentItem of equipmentList) {
        try {
          const { saveEquipment } = await import('@/services/offerService');
          const savedEquipment = await saveEquipment(
            {
              offer_id: offerId,
              title: equipmentItem.title,
              purchase_price: equipmentItem.purchasePrice,
              quantity: equipmentItem.quantity,
              margin: equipmentItem.margin,
              monthly_payment: equipmentItem.monthlyPayment || 0,
              serial_number: null,
              product_id: equipmentItem.productId || null,
              image_url: equipmentItem.imageUrl || equipmentItem.image_url || 
                        (equipmentItem.image_urls && equipmentItem.image_urls[0]) || null
            },
            equipmentItem.attributes || {},
            {}
          );
          
          if (savedEquipment) {
            console.log("✅ AmbassadorOfferSaveLogic - Equipment saved successfully:", savedEquipment.id);
          } else {
            console.error("❌ AmbassadorOfferSaveLogic - Failed to save equipment:", equipmentItem.title);
          }
        } catch (equipmentError) {
          console.error("❌ AmbassadorOfferSaveLogic - Error saving equipment:", equipmentItem.title, equipmentError);
        }
      }
      
      toast.success(isEditMode ? "Offre mise à jour avec succès!" : "Offre créée avec succès!");
      navigateToAmbassador("offers");
      
    } catch (error) {
      console.error("❌ AmbassadorOfferSaveLogic - Erreur lors de la sauvegarde de l'offre:", error);
      toast.error("Impossible de sauvegarder l'offre");
    } finally {
      setIsSubmitting(false);
    }
  };

  return { 
    handleSaveOffer,
    commissionData
  };
};
