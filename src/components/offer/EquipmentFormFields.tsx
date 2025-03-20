
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Package, Search } from "lucide-react";
import { Equipment } from "@/types/equipment";

interface EquipmentFormFieldsProps {
  equipment: Equipment;
  handleChange: (field: keyof Equipment, value: string | number) => void;
  errors: {
    title: boolean;
    purchasePrice: boolean;
    margin: boolean;
  };
  onOpenCatalog: () => void;
  calculatedMargin?: { percentage: number; amount: number };
  hideFinancialDetails?: boolean;
}

const EquipmentFormFields: React.FC<EquipmentFormFieldsProps> = ({
  equipment,
  handleChange,
  errors,
  onOpenCatalog,
  calculatedMargin,
  hideFinancialDetails = false
}) => {
  // Déterminer si on doit afficher la marge calculée
  const showCalculatedMargin = calculatedMargin && calculatedMargin.percentage > 0;
  
  return (
    <>
      <div>
        <Label htmlFor="equipment-title" className="font-medium text-gray-700">Intitulé du matériel</Label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <Package className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="equipment-title"
              value={equipment.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className={`pl-10 ${errors?.title ? "border-destructive" : ""}`}
              placeholder="Ex: ThinkPad T480"
            />
          </div>
          <Button 
            type="button" 
            variant="outline" 
            onClick={onOpenCatalog}
            title="Sélectionner depuis le catalogue"
            className="border-gray-300"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {errors?.title && (
          <p className="text-destructive text-xs mt-1">La désignation est requise</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="purchase-price" className={`font-medium text-gray-700 ${errors?.purchasePrice ? "text-destructive" : ""}`}>
            Prix d'achat (€)
          </Label>
          <div className="mt-1 relative">
            <Input
              id="purchase-price"
              type="number"
              min="0"
              step="1"
              value={equipment.purchasePrice || ''}
              onChange={(e) => handleChange('purchasePrice', parseFloat(e.target.value) || 0)}
              className={`pl-8 ${errors?.purchasePrice ? "border-destructive" : ""}`}
              placeholder="0.00"
            />
            <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">€</span>
            {errors?.purchasePrice && (
              <p className="text-destructive text-xs mt-1">Prix invalide</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="margin" className={`font-medium text-gray-700 ${errors?.margin ? "text-destructive" : ""}`}>
            Marge (%)
          </Label>
          <div className="mt-1 relative">
            <Input
              id="margin"
              type="number"
              min="0"
              step="0.1"
              value={showCalculatedMargin ? calculatedMargin.percentage.toFixed(2) : (equipment.margin || '')}
              onChange={(e) => handleChange('margin', parseFloat(e.target.value) || 0)}
              className={`pl-8 ${errors?.margin ? "border-destructive" : ""} ${showCalculatedMargin ? 'border-green-500 bg-green-50' : ''}`}
              placeholder="20.00"
            />
            <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">%</span>
            {errors?.margin && (
              <p className="text-destructive text-xs mt-1">Marge invalide</p>
            )}
            {showCalculatedMargin && (
              <p className="text-green-600 text-xs mt-1">
                Marge calculée disponible: {calculatedMargin.percentage.toFixed(2)}%
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default EquipmentFormFields;
