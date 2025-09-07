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
    // Use a simpler coefficient calculation for now
    const defaultCoefficient = 2.0;
    const newTotalMonthlyPayment = newTotalSellingPrice / 36 * defaultCoefficient;
    const newMargin = newTotalSellingPrice - totalPurchasePrice;
    const newCoefficient = totalPurchasePrice > 0 ? (newTotalMonthlyPayment * 36) / totalPurchasePrice : 0;
    
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
      // Use the database function to update equipment with global margin
      const { data, error } = await supabase.rpc('update_equipment_with_global_margin', {
        p_offer_id: offer.id,
        p_margin_percentage: newMarginPercent,
        p_leaser_id: leaser?.id || 'd60b86d7-a129-4a17-a877-e8e5caa66949' // Default to Grenke
      });
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        const result = data[0];
        if (result.success) {
          toast.success("Marge globale mise à jour avec succès");
          setIsEditing(false);
          onUpdate?.();
        } else {
          throw new Error(result.message);
        }
      }
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