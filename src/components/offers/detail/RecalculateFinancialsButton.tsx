import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calculator, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useOfferEquipment } from "@/hooks/useOfferEquipment";
import { useOfferUpdate } from "@/hooks/offers/useOfferUpdate";
import { supabase } from "@/integrations/supabase/client";

interface RecalculateFinancialsButtonProps {
  offerId: string;
  onRecalculated?: () => void;
}

const RecalculateFinancialsButton: React.FC<RecalculateFinancialsButtonProps> = ({
  offerId,
  onRecalculated
}) => {
  const [isRecalculating, setIsRecalculating] = useState(false);
  const { equipment, loading } = useOfferEquipment(offerId);
  const { updateOffer } = useOfferUpdate();

  const handleRecalculate = async () => {
    if (loading || !equipment || equipment.length === 0) {
      toast.error("Aucun équipement trouvé pour recalculer");
      return;
    }

    setIsRecalculating(true);
    try {
      console.log("🔄 MANUAL RECALCULATE: Starting for offer:", offerId);
      console.log("🔄 MANUAL RECALCULATE: Equipment found:", equipment.length, "items");

      // Calculate totals from equipment (multiply monthly_payment by quantity)
      const totals = equipment.reduce((acc, item) => {
        const purchasePrice = Number(item.purchase_price) || 0;
        const quantity = Number(item.quantity) || 1;
        const monthlyPayment = Number(item.monthly_payment) || 0;
        const sellingPrice = Number(item.selling_price) || 0;
        
        return {
          totalPurchasePrice: acc.totalPurchasePrice + (purchasePrice * quantity),
         // monthly_payment en BD est DÉJÀ le total pour cet équipement (pas unitaire)
         totalMonthlyPayment: acc.totalMonthlyPayment + monthlyPayment,
          totalSellingPrice: acc.totalSellingPrice + (sellingPrice * quantity)
        };
      }, {
        totalPurchasePrice: 0,
        totalMonthlyPayment: 0,
        totalSellingPrice: 0
      });

      console.log("🔄 MANUAL RECALCULATE: Calculated totals:", totals);

      // Get current offer data to get coefficient
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select('coefficient')
        .eq('id', offerId)
        .single();

      if (offerError) {
        throw new Error(`Failed to get offer data: ${offerError.message}`);
      }

      // Calculate financed amount: prioritize totalSellingPrice, fallback to calculation
      const coefficient = offerData.coefficient || 3.27;
      const financedAmount = totals.totalSellingPrice > 0 
        ? totals.totalSellingPrice 
        : totals.totalMonthlyPayment * coefficient;
      
      const calculatedMargin = financedAmount - totals.totalPurchasePrice;

      console.log("🔄 MANUAL RECALCULATE: financedAmount:", financedAmount);
      console.log("🔄 MANUAL RECALCULATE: calculatedMargin:", calculatedMargin);

      const updates = {
        amount: totals.totalPurchasePrice,
        monthly_payment: totals.totalMonthlyPayment,
        financed_amount: financedAmount,
        margin: calculatedMargin
      };

      console.log("🔄 MANUAL RECALCULATE: Updating offer with:", updates);

      await updateOffer(offerId, updates);
      
      toast.success("Calculs financiers mis à jour avec succès !");
      onRecalculated?.();
      
      console.log("✅ MANUAL RECALCULATE: Completed successfully");
    } catch (error) {
      console.error("❌ MANUAL RECALCULATE: Failed:", error);
      toast.error(`Erreur lors du recalcul: ${error.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <Button
      onClick={handleRecalculate}
      disabled={loading || isRecalculating || !equipment || equipment.length === 0}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      {isRecalculating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Calculator className="h-4 w-4" />
      )}
      {isRecalculating ? "Recalcul..." : "Recalculer les totaux"}
    </Button>
  );
};

export default RecalculateFinancialsButton;