import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Percent, Calculator, Save, X } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Leaser } from "@/types/equipment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { roundToTwoDecimals } from "@/utils/equipmentCalculations";

interface GlobalMarginEditorProps {
  offer: any;
  totalPurchasePrice: number;
  totalMonthlyPayment: number;
  displayMargin: string;
  marginPercentage: number;
  leaser: Leaser | null;
  equipment: any[];
  onUpdate: () => void;
}

export const GlobalMarginEditor: React.FC<GlobalMarginEditorProps> = ({
  offer,
  totalPurchasePrice,
  totalMonthlyPayment,
  displayMargin,
  marginPercentage,
  leaser,
  equipment,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newMarginPercent, setNewMarginPercent] = useState(marginPercentage);
  const [isSaving, setIsSaving] = useState(false);

  // Update local state when prop changes
  useEffect(() => {
    setNewMarginPercent(marginPercentage);
  }, [marginPercentage]);

  // Calculate new values based on margin percentage
  const calculateNewValues = (marginPercent: number) => {
    const newTotalSellingPrice = totalPurchasePrice * (1 + marginPercent / 100);
    const coefficient = Number(offer?.coefficient) || 0;
    const isPurchase = offer?.is_purchase === true;
    const newTotalMonthlyPayment = !isPurchase && coefficient > 0
      ? roundToTwoDecimals((newTotalSellingPrice * coefficient) / 100)
      : 0;
    const newMargin = newTotalSellingPrice - totalPurchasePrice;
    const newCoefficient = coefficient;
    
    return {
      newTotalSellingPrice,
      newTotalMonthlyPayment,
      newMargin,
      coefficient: newCoefficient
    };
  };

  // Handle saving the new margin percentage using database function
  const handleSave = async () => {
    if (newMarginPercent === marginPercentage) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const isPurchase = offer?.is_purchase === true;
      const coefficient = Number(offer?.coefficient) || 0;

      // 1) Calculer les nouvelles valeurs par équipement
      const computedById = new Map<
        string,
        { sellingPriceUnit: number; monthlyPaymentTotalLine: number }
      >();

      let computedTotalPurchase = 0;
      let computedTotalSelling = 0;
      let computedTotalMonthly = 0;

      for (const eq of equipment || []) {
        const id = String(eq.id);
        const purchasePrice = Number(eq.purchase_price ?? eq.purchasePrice) || 0;
        const qty = Number(eq.quantity) || 1;

        const sellingUnit = roundToTwoDecimals(purchasePrice * (1 + newMarginPercent / 100));
        const sellingTotal = sellingUnit * qty;

        const monthlyLine = !isPurchase && coefficient > 0
          ? roundToTwoDecimals((sellingTotal * coefficient) / 100)
          : 0;

        computedById.set(id, {
          sellingPriceUnit: sellingUnit,
          monthlyPaymentTotalLine: monthlyLine
        });

        computedTotalPurchase += purchasePrice * qty;
        computedTotalSelling += sellingTotal;
        computedTotalMonthly += monthlyLine;
      }

      // 2) Mettre à jour les équipements (marge + P.V. + mensualité)
      const equipmentUpdates = (equipment || []).map((eq) => {
        const id = String(eq.id);
        const computed = computedById.get(id);
        if (!computed) return Promise.resolve({ data: null, error: null });
        return supabase
          .from("offer_equipment")
          .update({
            margin: newMarginPercent,
            selling_price: computed.sellingPriceUnit,
            // IMPORTANT: monthly_payment en DB = TOTAL ligne (toutes quantités confondues)
            monthly_payment: computed.monthlyPaymentTotalLine
          })
          .eq("id", id);
      });

      const equipmentResults = await Promise.all(equipmentUpdates);
      const equipmentErrors = equipmentResults
        .map((r) => r.error)
        .filter(Boolean);
      if (equipmentErrors.length > 0) {
        throw equipmentErrors[0];
      }

      // 3) Mettre à jour l'offre (financed_amount = somme P.V.)
      const newOfferMarginEuro = computedTotalSelling - computedTotalPurchase;
      const { error: offerError } = await supabase
        .from("offers")
        .update({
          amount: roundToTwoDecimals(computedTotalPurchase),
          financed_amount: roundToTwoDecimals(computedTotalSelling),
          monthly_payment: roundToTwoDecimals(computedTotalMonthly),
          margin: roundToTwoDecimals(newOfferMarginEuro)
        })
        .eq("id", offer.id);

      if (offerError) throw offerError;

      toast.success("Marge globale et mensualités mises à jour");
      setIsEditing(false);
      onUpdate?.();
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour de la marge");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setNewMarginPercent(marginPercentage);
    setIsEditing(false);
  };

  const previewValues = calculateNewValues(newMarginPercent);

  if (!isEditing) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Percent className="w-5 h-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">Marge globale</span>
              </div>
              <div className="text-2xl font-bold text-amber-900">
                {marginPercentage.toFixed(1)}%
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              Éditer
            </Button>
          </div>
          <div className="mt-2 text-xs text-amber-600">
            {displayMargin} de marge sur {formatCurrency(totalPurchasePrice)}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Percent className="w-5 h-5 text-amber-600" />
          <Label className="text-sm font-medium text-amber-700">Nouvelle marge globale (%)</Label>
        </div>
        
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={newMarginPercent.toFixed(1)}
            onChange={(e) => setNewMarginPercent(parseFloat(e.target.value) || 0)}
            min="0"
            max="500"
            step="0.1"
            className="w-24 text-center font-bold"
          />
          <span className="text-sm text-amber-600">%</span>
        </div>

        {/* Preview calculations */}
        <div className="bg-white/70 rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-amber-700 mb-2">Aperçu des nouveaux calculs :</div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-gray-600">Prix de vente total :</span>
              <div className="font-bold text-amber-900">{formatCurrency(previewValues.newTotalSellingPrice)}</div>
            </div>
            
            <div>
              <span className="text-gray-600">Mensualité totale :</span>
              <div className="font-bold text-green-700">{formatCurrency(previewValues.newTotalMonthlyPayment)}</div>
            </div>
            
            <div>
              <span className="text-gray-600">Marge totale :</span>
              <div className="font-bold text-purple-700">{formatCurrency(previewValues.newMargin)}</div>
            </div>
            
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "Sauvegarde..." : "Appliquer"}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={isSaving}
            size="sm"
          >
            <X className="w-4 h-4 mr-2" />
            Annuler
          </Button>
        </div>
        
        <div className="text-xs text-amber-600">
          <Calculator className="w-3 h-3 inline mr-1" />
          Les mensualités individuelles seront recalculées proportionnellement
        </div>
      </CardContent>
    </Card>
  );
};