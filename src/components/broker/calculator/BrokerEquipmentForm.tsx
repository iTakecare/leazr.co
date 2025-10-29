import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LEASABLE_ASSET_TYPES, MANUFACTURERS } from '@/constants/leasableAssets';
import { BrokerEquipmentItem } from '@/types/brokerEquipment';
import { formatCurrency } from '@/lib/utils';
import { Plus } from 'lucide-react';

interface BrokerEquipmentFormProps {
  currentEquipment: Partial<BrokerEquipmentItem>;
  onEquipmentChange: (equipment: Partial<BrokerEquipmentItem>) => void;
  remainingBudget: number;
  onAdd: () => void;
}

const BrokerEquipmentForm: React.FC<BrokerEquipmentFormProps> = ({
  currentEquipment,
  onEquipmentChange,
  remainingBudget,
  onAdd
}) => {
  const handleChange = (field: keyof BrokerEquipmentItem, value: string | number) => {
    const updated = { ...currentEquipment, [field]: value };
    
    // Auto-calculate unitPrice based on quantity and remaining budget
    if (field === 'quantity') {
      const qty = value as number;
      if (qty > 0) {
        updated.unitPrice = remainingBudget / qty;
      }
    }
    
    onEquipmentChange(updated);
  };

  const canAdd = currentEquipment.objectType && 
                 currentEquipment.quantity && 
                 currentEquipment.quantity > 0 &&
                 remainingBudget > 0;

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="object-type">Type d'objet *</Label>
          <Select
            value={currentEquipment.objectType || ''}
            onValueChange={(value) => handleChange('objectType', value)}
          >
            <SelectTrigger id="object-type">
              <SelectValue placeholder="Sélectionner un type" />
            </SelectTrigger>
            <SelectContent>
              {LEASABLE_ASSET_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="manufacturer">Fabricant</Label>
          <Select
            value={currentEquipment.manufacturer || ''}
            onValueChange={(value) => handleChange('manufacturer', value)}
          >
            <SelectTrigger id="manufacturer">
              <SelectValue placeholder="Sélectionner un fabricant" />
            </SelectTrigger>
            <SelectContent>
              {MANUFACTURERS.map((mfr) => (
                <SelectItem key={mfr} value={mfr}>
                  {mfr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description / Détails</Label>
        <Input
          id="description"
          placeholder="Ex: Modèle XYZ, 16GB RAM, etc."
          value={currentEquipment.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantité *</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={currentEquipment.quantity || ''}
            onChange={(e) => handleChange('quantity', parseInt(e.target.value) || 0)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="unit-price">Prix unitaire</Label>
          <Input
            id="unit-price"
            value={currentEquipment.unitPrice ? formatCurrency(currentEquipment.unitPrice) : ''}
            disabled
            className="bg-muted"
          />
        </div>

        <div className="space-y-2">
          <Label>Total</Label>
          <Input
            value={
              currentEquipment.quantity && currentEquipment.unitPrice
                ? formatCurrency(currentEquipment.quantity * currentEquipment.unitPrice)
                : ''
            }
            disabled
            className="bg-muted font-semibold"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-sm">
          <span className="text-muted-foreground">Budget restant : </span>
          <span className="font-bold text-lg text-primary">
            {formatCurrency(remainingBudget)}
          </span>
        </div>
        
        <Button
          onClick={onAdd}
          disabled={!canAdd}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Ajouter à la liste
        </Button>
      </div>
    </div>
  );
};

export default BrokerEquipmentForm;
