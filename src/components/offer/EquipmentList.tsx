
import React from 'react';
import { Equipment } from '@/types/equipment';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Plus, MinusCircle, PlusCircle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export interface EquipmentListProps {
  equipment: Equipment;
  onChange: (newEquipment: Equipment) => void;
}

const EquipmentList: React.FC<EquipmentListProps> = ({ equipment, onChange }) => {
  // Sample implementation for handling equipment changes
  const handleDelete = (id: string) => {
    const updatedItems = equipment.items.filter(item => item.id !== id);
    onChange({ ...equipment, items: updatedItems });
  };
  
  const handleQuantityChange = (id: string, amount: number) => {
    const updatedItems = equipment.items.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + amount);
        return {
          ...item,
          quantity: newQuantity,
          total_price: item.unit_price * newQuantity
        };
      }
      return item;
    });
    
    onChange({ ...equipment, items: updatedItems });
  };

  return (
    <div className="space-y-4">
      {equipment.items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Aucun équipement ajouté. Utilisez le calculateur ci-dessous pour ajouter de l'équipement.
        </div>
      ) : (
        <div className="border rounded-md divide-y">
          {equipment.items.map(item => (
            <div key={item.id} className="p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">
                  {formatCurrency(item.unit_price)} × {item.quantity}
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleQuantityChange(item.id, -1)}
                  disabled={item.quantity <= 1}
                >
                  <MinusCircle className="h-4 w-4" />
                </Button>
                <span className="w-8 text-center">{item.quantity}</span>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => handleQuantityChange(item.id, 1)}
                >
                  <PlusCircle className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="w-24 text-right font-medium">
                {formatCurrency(item.total_price)}
              </div>
              
              <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-center py-2 font-medium">
        <span>Total</span>
        <span>{formatCurrency(equipment.items.reduce((sum, item) => sum + item.total_price, 0))}</span>
      </div>
    </div>
  );
};

export default EquipmentList;
