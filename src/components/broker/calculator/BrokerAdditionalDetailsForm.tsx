import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/utils';

interface BrokerAdditionalDetailsFormProps {
  quantity: number;
  financedAmount: number;
  objectType: string;
  manufacturer: string;
  sirenNumber: string;
  onFieldChange: (field: string, value: string | number) => void;
}

const BrokerAdditionalDetailsForm: React.FC<BrokerAdditionalDetailsFormProps> = ({
  quantity,
  financedAmount,
  objectType,
  manufacturer,
  sirenNumber,
  onFieldChange
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Détails additionnels</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantité</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => onFieldChange('quantity', parseInt(e.target.value) || 1)}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="financed-amount">Montant financé</Label>
            <Input
              id="financed-amount"
              value={formatCurrency(financedAmount)}
              disabled
              className="bg-muted"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="object-type">Type d'objet</Label>
          <Input
            id="object-type"
            placeholder="Ex: Ordinateur portable, Imprimante..."
            value={objectType}
            onChange={(e) => onFieldChange('objectType', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manufacturer">Fabricant</Label>
          <Input
            id="manufacturer"
            placeholder="Ex: Dell, HP, Lenovo..."
            value={manufacturer}
            onChange={(e) => onFieldChange('manufacturer', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="siren">Numéro SIREN</Label>
          <Input
            id="siren"
            placeholder="123 456 789"
            value={sirenNumber}
            onChange={(e) => onFieldChange('sirenNumber', e.target.value)}
            maxLength={11}
          />
          <p className="text-xs text-muted-foreground">
            Format: 9 chiffres (espaces optionnels)
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BrokerAdditionalDetailsForm;
