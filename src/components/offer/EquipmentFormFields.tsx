
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Equipment } from "@/types/equipment";
import { Search } from "lucide-react";

interface EquipmentFormFieldsProps {
  equipment: Equipment;
  handleChange: (field: keyof Equipment, value: string | number) => void;
  errors: Record<string, boolean>;
  onOpenCatalog: () => void;
  calculatedMargin?: { percentage: number; amount: number };
  hideFinancialDetails?: boolean;
  hidePurchasePrice?: boolean;
}

const EquipmentFormFields: React.FC<EquipmentFormFieldsProps> = ({
  equipment,
  handleChange,
  errors,
  onOpenCatalog,
  calculatedMargin,
  hideFinancialDetails = false,
  hidePurchasePrice = false
}) => {
  const marginToDisplay = calculatedMargin && calculatedMargin.percentage > 0 
    ? calculatedMargin.percentage 
    : equipment.margin;

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title" className={`block font-medium ${errors.title ? 'text-red-500' : 'text-gray-700'}`}>
          Désignation du produit *
        </Label>
        <div className="mt-1 flex gap-2">
          <Input
            id="title"
            type="text"
            value={equipment.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className={`${errors.title ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Nom du produit"
          />
          <Button
            type="button"
            onClick={onOpenCatalog}
            className="min-w-[44px] p-2 bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
        {errors.title && (
          <p className="mt-1 text-sm text-red-500">Ce champ est requis</p>
        )}
      </div>
      
      <div className={`grid ${hidePurchasePrice ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
        {!hidePurchasePrice && (
          <div>
            <Label htmlFor="purchasePrice" className={`block font-medium ${errors.purchasePrice ? 'text-red-500' : 'text-gray-700'}`}>
              Prix d'achat (€) *
            </Label>
            <div className="mt-1 relative">
              <Input
                id="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                value={equipment.purchasePrice === 0 ? '' : equipment.purchasePrice}
                onChange={(e) => handleChange('purchasePrice', parseFloat(e.target.value) || 0)}
                className={`pl-8 ${errors.purchasePrice ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="0.00"
              />
              <span className="absolute left-3 top-3 text-gray-500 pointer-events-none">€</span>
            </div>
            {errors.purchasePrice && (
              <p className="mt-1 text-sm text-red-500">Ce champ est requis</p>
            )}
          </div>
        )}
        
        <div>
          <Label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
            Quantité
          </Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={equipment.quantity}
            onChange={(e) => handleChange('quantity', parseInt(e.target.value, 10) || 1)}
            className="mt-1"
          />
        </div>
      </div>

      {!hideFinancialDetails && (
        <div>
          <Label htmlFor="margin" className={`block font-medium ${errors.margin ? 'text-red-500' : 'text-gray-700'}`}>
            Marge (%) *
          </Label>
          <div className="mt-1 relative">
            <Input
              id="margin"
              type="number"
              min="0"
              step="0.1"
              value={marginToDisplay === 0 ? '' : marginToDisplay}
              onChange={(e) => handleChange('margin', parseFloat(e.target.value) || 0)}
              className={`pr-8 ${errors.margin ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="0.0"
            />
            <span className="absolute right-3 top-3 text-gray-500 pointer-events-none">%</span>
            {calculatedMargin && calculatedMargin.percentage > 0 && (
              <p className="mt-1 text-xs text-blue-600">
                Marge calculée automatiquement : {calculatedMargin.percentage.toFixed(2)}%
              </p>
            )}
          </div>
          {errors.margin && (
            <p className="mt-1 text-sm text-red-500">Ce champ est requis</p>
          )}
        </div>
      )}

      {/* Affichage des attributs sélectionnés */}
      {equipment.attributes && Object.keys(equipment.attributes).length > 0 && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="font-semibold text-sm text-blue-900 mb-2">Configuration sélectionnée :</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(equipment.attributes).map(([key, value]) => (
              <span key={key} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                {key}: {String(value)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Affichage des spécifications si présentes */}
      {equipment.specifications && Object.keys(equipment.specifications).length > 0 && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200">
          <h4 className="font-semibold text-sm text-green-900 mb-2">Spécifications :</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(equipment.specifications).map(([key, value]) => (
              <span key={key} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium">
                {key}: {String(value)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentFormFields;
