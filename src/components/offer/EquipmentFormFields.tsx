
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Search, Package } from "lucide-react";
import { Equipment } from "@/types/equipment";
import { formatPercentageWithComma } from "@/utils/formatters";

interface EquipmentFormFieldsProps {
  equipment: Equipment;
  handleChange: (field: keyof Equipment, value: string | number) => void;
  errors: Record<string, boolean>;
  onOpenCatalog: () => void;
  calculatedMargin: { percentage: number; amount: number };
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
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="title" className="font-medium text-gray-700">Intitulé du matériel</Label>
        <div className="mt-1 flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Package className="h-5 w-5 text-gray-400" />
            </div>
            <Input
              id="title"
              value={equipment.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className={`pl-10 ${errors.title ? "border-red-500" : ""}`}
              placeholder="Nom du matériel"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={onOpenCatalog}
            className="flex items-center"
          >
            <Search className="h-4 w-4 mr-1" />
          </Button>
        </div>
        {errors.title && <p className="text-sm text-red-500 mt-1">Ce champ est requis</p>}
      </div>

      {!hideFinancialDetails && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="price" className="font-medium text-gray-700">Prix d'achat (€)</Label>
            <div className="mt-1 relative">
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={equipment.purchasePrice || ""}
                onChange={(e) => handleChange("purchasePrice", e.target.value)}
                className={`pl-8 ${errors.purchasePrice ? "border-red-500" : ""}`}
                placeholder="0.00"
              />
              <span className="absolute left-3 top-2.5 text-gray-500 pointer-events-none">€</span>
            </div>
            {errors.purchasePrice && <p className="text-sm text-red-500 mt-1">Entrez un prix valide</p>}
          </div>

          <div>
            <Label htmlFor="margin" className="font-medium text-gray-700">Marge (%)</Label>
            <div className="mt-1 relative">
              <Input
                id="margin"
                type="number"
                min="0"
                step="0.01"
                value={calculatedMargin.percentage > 0 ? calculatedMargin.percentage : (equipment.margin || "")}
                onChange={(e) => handleChange("margin", e.target.value)}
                className={`pl-8 ${errors.margin ? "border-red-500" : ""} ${calculatedMargin.percentage > 0 ? "bg-green-50 border-green-300" : ""}`}
                placeholder="0.00"
              />
              <span className="absolute left-3 top-2.5 text-gray-500 pointer-events-none">%</span>
            </div>
            {calculatedMargin.percentage > 0 && (
              <p className="text-sm text-green-600 mt-1">
                Marge calculée disponible: {formatPercentageWithComma(calculatedMargin.percentage)}
              </p>
            )}
            {errors.margin && <p className="text-sm text-red-500 mt-1">Entrez une marge valide</p>}
          </div>
        </div>
      )}

      {/* Hidden inputs for preserving values when fields are hidden */}
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
