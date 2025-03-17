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
}

const EquipmentFormFields: React.FC<EquipmentFormFieldsProps> = ({
  equipment,
  handleChange,
  errors,
  onOpenCatalog,
  calculatedMargin
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

      {/* Les champs prix d'achat et marge sont désormais masqués */}
    </>
  );
};

export default EquipmentFormFields;
