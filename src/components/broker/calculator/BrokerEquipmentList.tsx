import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { BrokerEquipmentItem } from '@/types/brokerEquipment';
import { formatCurrency } from '@/lib/utils';
import { X } from 'lucide-react';

interface BrokerEquipmentListProps {
  equipmentList: BrokerEquipmentItem[];
  onRemove: (id: string) => void;
}

const BrokerEquipmentList: React.FC<BrokerEquipmentListProps> = ({
  equipmentList,
  onRemove
}) => {
  if (equipmentList.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun équipement ajouté. Utilisez le formulaire ci-dessus pour en ajouter.
      </div>
    );
  }

  const totalAmount = equipmentList.reduce((sum, eq) => sum + eq.totalPrice, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Qté</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Fabricant</TableHead>
              <TableHead>Détails</TableHead>
              <TableHead className="text-right">Prix unitaire</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {equipmentList.map((equipment) => (
              <TableRow key={equipment.id}>
                <TableCell className="font-medium">{equipment.quantity}</TableCell>
                <TableCell>{equipment.objectType}</TableCell>
                <TableCell>{equipment.manufacturer || '-'}</TableCell>
                <TableCell className="max-w-xs truncate">{equipment.description || '-'}</TableCell>
                <TableCell className="text-right">{formatCurrency(equipment.unitPrice)}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(equipment.totalPrice)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemove(equipment.id)}
                    className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/50">
              <TableCell colSpan={5} className="text-right font-bold">
                TOTAL
              </TableCell>
              <TableCell className="text-right font-bold text-lg">
                {formatCurrency(totalAmount)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BrokerEquipmentList;
