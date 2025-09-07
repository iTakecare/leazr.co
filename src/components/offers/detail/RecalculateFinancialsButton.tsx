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

      // Calculate totals from equipment
      const totals = equipment.reduce((acc, item) => {
        const purchasePrice = Number(item.purchase_price) || 0;
        const quantity = Number(item.quantity) || 1;
        const monthlyPayment = Number(item.monthly_payment) || 0;
        
        return {
          totalPurchasePrice: acc.totalPurchasePrice + (purchasePrice * quantity),
          totalMonthlyPayment: acc.totalMonthlyPayment + (monthlyPayment * quantity)
        };
      }, {
        totalPurchasePrice: 0,
        totalMonthlyPayment: 0
      });

      console.log("🔄 MANUAL RECALCULATE: Calculated totals:", totals);

      // Calculate margin (financed amount - purchase price)
      // We'll need to get the current offer data to get financed_amount
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select('financed_amount, amount')
        .eq('id', offerId)
        .single();

      if (offerError) {
        throw new Error(`Failed to get offer data: ${offerError.message}`);
      }

      const financedAmount = offerData.financed_amount || offerData.amount || 0;
      const calculatedMargin = financedAmount - totals.totalPurchasePrice;

      const updates = {
        amount: totals.totalPurchasePrice,
        monthly_payment: totals.totalMonthlyPayment,
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