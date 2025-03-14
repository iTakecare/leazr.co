
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatPercentage } from "@/utils/formatters";
import { Plus, Package, X, Edit } from "lucide-react";
import { Equipment, Leaser } from "@/types/equipment";

interface EquipmentFormProps {
  equipment: Equipment;
  setEquipment: (equipment: Equipment) => void;
  selectedLeaser: Leaser | null;
  addToList: () => void;
  editingId: string | null;
  cancelEditing: () => void;
  onOpenCatalog: () => void;
  coefficient: number;
  monthlyPayment: number;
}

const EquipmentForm: React.FC<EquipmentFormProps> = ({
  equipment,
  setEquipment,
  selectedLeaser,
  addToList,
  editingId,
  cancelEditing,
  onOpenCatalog,
  coefficient,
  monthlyPayment
}) => {
  const [errors, setErrors] = useState({
    title: false,
    purchasePrice: false,
    margin: false
  });

  const handleChange = (field: keyof Equipment, value: string | number) => {
    setEquipment({ ...equipment, [field]: value });
    
    // Clear error for this field if it was previously marked as error
    if (errors[field as keyof typeof errors]) {
      setErrors({ ...errors, [field]: false });
    }
  };

  const validateForm = () => {
    const newErrors = {
      title: !equipment.title,
      purchasePrice: equipment.purchasePrice <= 0,
      margin: equipment.margin < 0
    };
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = () => {
    if (validateForm()) {
      addToList();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center">
          <Package className="h-4 w-4 mr-2 text-primary" />
          {editingId ? "Modifier l'équipement" : "Nouvel équipement"}
        </CardTitle>
        <CardDescription className="text-xs">
          {editingId ? "Modifiez les détails de l'équipement" : "Ajoutez un équipement à votre offre"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="equipment-title" className={errors.title ? "text-destructive" : ""}>
              Désignation*
            </Label>
            <div className="mt-1 flex gap-2">
              <Input
                id="equipment-title"
                value={equipment.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className={errors.title ? "border-destructive" : ""}
                placeholder="Ex: Laptop HP ProBook 450 G8"
              />
              <Button 
                type="button" 
                variant="outline" 
                onClick={onOpenCatalog}
                title="Sélectionner depuis le catalogue"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {errors.title && (
              <p className="text-destructive text-xs mt-1">La désignation est requise</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchase-price" className={errors.purchasePrice ? "text-destructive" : ""}>
                Prix d'achat*
              </Label>
              <div className="mt-1">
                <Input
                  id="purchase-price"
                  type="number"
                  min="0"
                  step="1"
                  value={equipment.purchasePrice || ''}
                  onChange={(e) => handleChange('purchasePrice', parseFloat(e.target.value) || 0)}
                  className={errors.purchasePrice ? "border-destructive" : ""}
                  placeholder="0.00"
                />
                {errors.purchasePrice && (
                  <p className="text-destructive text-xs mt-1">Prix invalide</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="margin" className={errors.margin ? "text-destructive" : ""}>
                Marge (%)
              </Label>
              <div className="mt-1">
                <Input
                  id="margin"
                  type="number"
                  min="0"
                  step="0.1"
                  value={equipment.margin || ''}
                  onChange={(e) => handleChange('margin', parseFloat(e.target.value) || 0)}
                  className={errors.margin ? "border-destructive" : ""}
                  placeholder="0.00"
                />
                {errors.margin && (
                  <p className="text-destructive text-xs mt-1">Marge invalide</p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantity">Quantité</Label>
              <div className="mt-1">
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={equipment.quantity || 1}
                  onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 1)}
                  placeholder="1"
                />
              </div>
            </div>

            <div>
              <Label>Coefficient</Label>
              <div className="mt-1 h-9 px-3 py-1 rounded-md border border-input bg-background text-sm flex items-center">
                {formatPercentage(coefficient)}
              </div>
            </div>
          </div>

          <div className="bg-muted/50 p-3 rounded">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Prix financé:</span>
              <span className="font-medium">{formatCurrency(equipment.purchasePrice * (1 + equipment.margin / 100))}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mensualité (par unité):</span>
              <span className="font-medium">{formatCurrency(monthlyPayment)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            {editingId ? (
              <>
                <Button 
                  variant="default" 
                  onClick={handleSubmit} 
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-2" /> Mettre à jour
                </Button>
                <Button 
                  variant="outline" 
                  onClick={cancelEditing}
                  className="flex-1"
                >
                  <X className="h-4 w-4 mr-2" /> Annuler
                </Button>
              </>
            ) : (
              <Button 
                variant="default" 
                onClick={handleSubmit}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" /> Ajouter à la liste
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default EquipmentForm;
