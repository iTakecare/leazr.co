
import React from 'react';
import { Equipment, EquipmentItem } from '@/types/equipment';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Plus, Package } from 'lucide-react';

interface EquipmentListProps {
  equipment: Equipment;
  onChange: (newEquipment: Equipment) => void;
}

const EquipmentList: React.FC<EquipmentListProps> = ({ equipment, onChange }) => {
  const addItem = () => {
    const newEquipment = { ...equipment };
    newEquipment.items.push({
      id: crypto.randomUUID(),
      title: '',
      description: '',
      quantity: 1,
      purchasePrice: 0,
      margin: 0,
      total_price: 0,
      // Support legacy field names
      name: '',
      unit_price: 0
    });
    onChange(newEquipment);
  };

  const removeItem = (index: number) => {
    const newEquipment = { ...equipment };
    newEquipment.items.splice(index, 1);
    onChange(newEquipment);
  };

  const updateItem = (index: number, key: string, value: string | number) => {
    const newEquipment = { ...equipment };
    newEquipment.items[index] = {
      ...newEquipment.items[index],
      [key]: value
    };
    
    // Recalculate total price if quantity or unit_price changes
    if (key === 'quantity' || key === 'unit_price' || key === 'purchasePrice') {
      const item = newEquipment.items[index];
      if (key === 'unit_price') {
        item.purchasePrice = value as number;
      } else if (key === 'purchasePrice') {
        item.unit_price = value as number;
      }
      item.total_price = item.quantity * (item.purchasePrice || item.unit_price || 0);
    }
    
    // Support both title and name fields
    if (key === 'name') {
      newEquipment.items[index].title = value as string;
    } else if (key === 'title') {
      newEquipment.items[index].name = value as string;
    }
    
    onChange(newEquipment);
  };

  return (
    <div>
      {equipment.items.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-md">
          <Package className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun équipement ajouté
          </p>
          <Button onClick={addItem} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un équipement
          </Button>
        </div>
      ) : (
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead className="w-[80px]">Qté</TableHead>
                <TableHead className="w-[120px]">Prix unitaire</TableHead>
                <TableHead className="w-[120px]">Total</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {equipment.items.map((item, index) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <input
                      type="text"
                      value={item.name || item.title}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      className="w-full border-0 bg-transparent p-0 focus:ring-0"
                      placeholder="Nom de l'équipement"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full border-0 bg-transparent p-0 focus:ring-0 text-right"
                      min="1"
                    />
                  </TableCell>
                  <TableCell>
                    <input
                      type="number"
                      value={item.unit_price || item.purchasePrice}
                      onChange={(e) => updateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="w-full border-0 bg-transparent p-0 focus:ring-0 text-right"
                      min="0"
                      step="0.01"
                    />
                    €
                  </TableCell>
                  <TableCell className="text-right">
                    {item.total_price.toFixed(2)} €
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-8 w-8 p-0"
                    >
                      &times;
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          <div className="mt-4 flex justify-between items-center">
            <Button onClick={addItem} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un élément
            </Button>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Total:</div>
              <div className="text-lg font-medium">
                {equipment.items.reduce((sum, item) => sum + item.total_price, 0).toFixed(2)} €
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EquipmentList;
