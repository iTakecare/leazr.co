import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrokerEquipmentItem } from '@/types/brokerEquipment';
import { formatCurrency } from '@/lib/utils';
import BrokerEquipmentForm from './BrokerEquipmentForm';
import BrokerEquipmentList from './BrokerEquipmentList';

interface BrokerAdditionalDetailsFormProps {
  totalBudget: number;
  usedBudget: number;
  remainingBudget: number;
  equipmentList: BrokerEquipmentItem[];
  currentEquipment: Partial<BrokerEquipmentItem>;
  onEquipmentChange: (equipment: Partial<BrokerEquipmentItem>) => void;
  onAddEquipment: () => void;
  onRemoveEquipment: (id: string) => void;
}

const BrokerAdditionalDetailsForm: React.FC<BrokerAdditionalDetailsFormProps> = ({
  totalBudget,
  usedBudget,
  remainingBudget,
  equipmentList,
  currentEquipment,
  onEquipmentChange,
  onAddEquipment,
  onRemoveEquipment
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Détails sur le bien</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Budget Summary */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Budget total</span>
            <span className="font-bold text-lg">{formatCurrency(totalBudget)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Utilisé</span>
            <span className="text-sm">{formatCurrency(usedBudget)}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-semibold">Restant disponible</span>
            <span className="text-xl font-bold text-primary">{formatCurrency(remainingBudget)}</span>
          </div>
        </div>

        {/* Equipment Form */}
        <BrokerEquipmentForm
          currentEquipment={currentEquipment}
          onEquipmentChange={onEquipmentChange}
          remainingBudget={remainingBudget}
          onAdd={onAddEquipment}
        />

        {/* Equipment List */}
        <BrokerEquipmentList
          equipmentList={equipmentList}
          onRemove={onRemoveEquipment}
        />
      </CardContent>
    </Card>
  );
};

export default BrokerAdditionalDetailsForm;
