
import React, { useState, useEffect } from "react";
import { Euro, Package, Percent, Plus, Pencil, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Equipment, Leaser } from "@/types/equipment";
import { formatCurrency } from "@/utils/formatters";

interface EquipmentFormProps {
  equipment: Equipment;
  setEquipment: React.Dispatch<React.SetStateAction<Equipment>>;
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
  monthlyPayment,
}) => {
  const handleMarginChange = (value: string) => {
    const newMargin = parseFloat(value);
    if (!isNaN(newMargin) && newMargin >= 0) {
      setEquipment({
        ...equipment,
        margin: Number(Math.min(1000, newMargin).toFixed(2))
      });
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-4">
        <Label className="text-sm font-medium text-gray-700">
          Intitulé du matériel
        </Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              className="pl-10"
              value={equipment.title}
              onChange={(e) =>
                setEquipment({ ...equipment, title: e.target.value })
              }
              placeholder="Ex: ThinkPad T480"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onOpenCatalog}
            title="Sélectionner depuis le catalogue"
          >
            <FolderOpen className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium text-gray-700">
            Prix d'achat (€)
          </Label>
          <div className="relative">
            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="number"
              min="0"
              step="0.01"
              className="pl-10"
              value={equipment.purchasePrice || ''}
              onChange={(e) =>
                setEquipment({
                  ...equipment,
                  purchasePrice: Math.max(0, parseFloat(e.target.value) || 0),
                })
              }
            />
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium text-gray-700">
            Marge (%)
          </Label>
          <div className="relative">
            <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="number"
              min="0"
              max="1000"
              step="0.01"
              className="pl-10"
              value={equipment.margin.toFixed(2)}
              onChange={(e) => handleMarginChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-6">
        <div className="grid gap-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Marge en euros :</span>
            <span className="font-semibold">
              {formatCurrency(equipment.purchasePrice * (equipment.margin / 100))}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Prix avec marge :</span>
            <span className="font-semibold">
              {formatCurrency(equipment.purchasePrice * (1 + equipment.margin / 100))}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Coefficient appliqué :</span>
            <span className="font-semibold">{coefficient.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center text-lg font-bold text-blue-600">
            <span>Mensualité unitaire :</span>
            <span>{formatCurrency(monthlyPayment)}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={addToList}
          className="flex-1"
          disabled={!equipment.title || equipment.purchasePrice <= 0}
        >
          {editingId ? (
            <>
              <Pencil className="mr-2 h-4 w-4" />
              Mettre à jour
            </>
          ) : (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter à la liste
            </>
          )}
        </Button>
        {editingId && (
          <Button
            onClick={cancelEditing}
            variant="destructive"
          >
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
};

export default EquipmentForm;
