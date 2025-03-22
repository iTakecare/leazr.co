
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Package, X } from "lucide-react";
import { Equipment } from "@/types/equipment";
import { formatPercentageWithComma } from "@/utils/formatters";

interface EquipmentFormFieldsProps {
  equipment: Equipment;
  handleChange: (field: keyof Equipment, value: string | number) => void;
  errors: Record<string, boolean>;
  onOpenCatalog: () => void;
  calculatedMargin: { percentage: number; amount: number };
  hideFinancialDetails?: boolean;
  onRemove?: () => void;
}

const EquipmentFormFields: React.FC<EquipmentFormFieldsProps> = ({
  equipment,
  handleChange,
  errors,
  onOpenCatalog,
  calculatedMargin,
  hideFinancialDetails = false,
  onRemove
}) => {
  return (
    <div className="space-y-3 relative">
      {/* Bouton pour supprimer l'équipement si onRemove est fourni */}
      {onRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-50 border border-red-200 hover:bg-red-100"
          title="Supprimer cet équipement"
        >
          <X className="h-3.5 w-3.5 text-red-500" />
        </Button>
      )}
      
      <div>
        <Label htmlFor="title" className="text-xs font-medium text-gray-600">Intitulé du matériel</Label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Package className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              id="title"
              value={equipment.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className={`pl-10 text-sm py-1 h-9 ${errors.title ? "border-red-500" : "border-gray-200"}`}
              placeholder="Nom du matériel"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onOpenCatalog}
            className="flex items-center h-9 px-2"
            size="sm"
          >
            <Search className="h-3.5 w-3.5 mr-1" />
            <span className="text-xs">Catalogue</span>
          </Button>
        </div>
        {errors.title && <p className="text-xs text-red-500 mt-0.5">Ce champ est requis</p>}
      </div>

      {!hideFinancialDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 bg-gray-50 p-2 rounded-md border border-gray-100">
          <div>
            <Label htmlFor="price" className="text-xs font-medium text-gray-600">Prix d'achat (€)</Label>
            <div className="mt-0.5 relative">
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={equipment.purchasePrice || ""}
                onChange={(e) => handleChange("purchasePrice", e.target.value)}
                className={`pl-7 text-sm py-1 h-8 ${errors.purchasePrice ? "border-red-500" : "border-gray-200"}`}
                placeholder="0.00"
              />
              <span className="absolute left-2.5 top-2 text-gray-500 pointer-events-none text-xs">€</span>
            </div>
            {errors.purchasePrice && <p className="text-xs text-red-500 mt-0.5">Entrez un prix valide</p>}
          </div>

          <div>
            <Label htmlFor="margin" className="text-xs font-medium text-gray-600">Marge (%)</Label>
            <div className="mt-0.5 relative">
              <Input
                id="margin"
                type="number"
                min="0"
                step="0.01"
                value={calculatedMargin.percentage > 0 ? calculatedMargin.percentage : (equipment.margin || "")}
                onChange={(e) => handleChange("margin", e.target.value)}
                className={`pl-7 text-sm py-1 h-8 ${errors.margin ? "border-red-500" : ""} ${calculatedMargin.percentage > 0 ? "bg-green-50 border-green-300" : "border-gray-200"}`}
                placeholder="0.00"
              />
              <span className="absolute left-2.5 top-2 text-gray-500 pointer-events-none text-xs">%</span>
            </div>
            {calculatedMargin.percentage > 0 && (
              <p className="text-xs text-green-600 mt-0.5">
                Marge calculée: {formatPercentageWithComma(calculatedMargin.percentage)}
              </p>
            )}
            {errors.margin && <p className="text-xs text-red-500 mt-0.5">Entrez une marge valide</p>}
          </div>
        </div>
      )}

      {/* Champs cachés pour préserver les valeurs quand les champs sont masqués */}
      {hideFinancialDetails && (
        <input
          type="hidden"
          name="purchasePrice"
          value={equipment.purchasePrice || ""}
          onChange={(e) => handleChange("purchasePrice", e.target.value)}
        />
      )}
      {hideFinancialDetails && (
        <input
          type="hidden"
          name="margin"
          value={calculatedMargin.percentage > 0 ? calculatedMargin.percentage : (equipment.margin || "")}
          onChange={(e) => handleChange("margin", e.target.value)}
        />
      )}
    </div>
  );
};

export default EquipmentFormFields;
