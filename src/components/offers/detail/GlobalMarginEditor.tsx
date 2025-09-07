import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Percent, Calculator, Save, X } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { Leaser } from "@/types/equipment";
import { getCoefficientFromLeaser } from "@/utils/leaserCalculator";
import { updateOfferEquipment } from "@/services/offers/offerEquipment";
import { updateOffer } from "@/services/offers/offerDetail";
import { useToast } from "@/hooks/use-toast";

interface GlobalMarginEditorProps {
  offer: any;
  totalPurchasePrice: number;
  totalMonthlyPayment: number;
  displayMargin: number;
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
  const { toast } = useToast();

  // Update local state when prop changes
  useEffect(() => {
    setNewMarginPercent(marginPercentage);
  }, [marginPercentage]);

  const calculateNewValues = (marginPercent: number) => {
    // Calculate new total selling price based on margin %
    const newTotalSellingPrice = totalPurchasePrice * (1 + marginPercent / 100);
    
    // Use the offer's duration (default to 36 months)
    const duration = offer.duration || 36;
    
    // Get coefficient from leaser for the new selling price
    const coefficient = getCoefficientFromLeaser(leaser, newTotalSellingPrice, duration);
    
    // Calculate new total monthly payment
    const newTotalMonthlyPayment = (newTotalSellingPrice * coefficient) / 100;
    
    return {
      newTotalSellingPrice,
      newTotalMonthlyPayment,
      coefficient,
      newMargin: newTotalSellingPrice - totalPurchasePrice
    };
  };

  const handleSave = async () => {
    if (newMarginPercent < 0) {
      toast({
        title: "Erreur",
        description: "La marge ne peut pas être négative",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);

    try {
      const { newTotalSellingPrice, newTotalMonthlyPayment, coefficient, newMargin } = calculateNewValues(newMarginPercent);

      // Update each equipment proportionally
      const updatePromises = equipment.map(async (item) => {
        const equipmentPurchaseTotal = item.purchase_price * item.quantity;
        const equipmentRatio = equipmentPurchaseTotal / totalPurchasePrice;
        
        // Calculate proportional values for this equipment
        const newEquipmentMonthlyTotal = newTotalMonthlyPayment * equipmentRatio;
        const newEquipmentMonthlyPayment = newEquipmentMonthlyTotal / item.quantity;
        const newEquipmentSellingPrice = (newTotalSellingPrice * equipmentRatio) / item.quantity;
        const newEquipmentMargin = newEquipmentSellingPrice - item.purchase_price;

        return updateOfferEquipment(item.id, {
          monthly_payment: newEquipmentMonthlyPayment,
          selling_price: newEquipmentSellingPrice,
          margin: newEquipmentMargin,
          coefficient: coefficient
        });
      });

      await Promise.all(updatePromises);

      // Update the offer with new totals
      await updateOffer(offer.id, {
        monthly_payment: newTotalMonthlyPayment,
        financed_amount: newTotalSellingPrice,
        margin: newMargin,
        coefficient: coefficient
      });

      toast({
        title: "Succès",
        description: `Marge mise à jour à ${newMarginPercent.toFixed(1)}%`,
      });

      setIsEditing(false);
      onUpdate();
    } catch (error) {
      console.error("Error updating margin:", error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la mise à jour de la marge",
        variant: "destructive"
      });
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
            {formatCurrency(displayMargin)} de marge sur {formatCurrency(totalPurchasePrice)}
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
            
            <div>
              <span className="text-gray-600">Coefficient :</span>
              <div className="font-bold text-orange-700">{previewValues.coefficient}</div>
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