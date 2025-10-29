import React from 'react';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';

interface BrokerCalculationModeProps {
  mode: 'purchase_price' | 'rent';
  onModeChange: (mode: 'purchase_price' | 'rent') => void;
}

const BrokerCalculationMode: React.FC<BrokerCalculationModeProps> = ({
  mode,
  onModeChange
}) => {
  return (
    <Card>
      <CardContent className="pt-6">
        <RadioGroup
          value={mode}
          onValueChange={(value) => onModeChange(value as 'purchase_price' | 'rent')}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="purchase_price" id="purchase_price" />
            <Label htmlFor="purchase_price" className="cursor-pointer font-normal">
              Prix d'achat (HT)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="rent" id="rent" />
            <Label htmlFor="rent" className="cursor-pointer font-normal">
              Loyer mensuel
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
};

export default BrokerCalculationMode;
