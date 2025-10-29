import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import AmbassadorSelector, { AmbassadorSelectorAmbassador } from '@/components/ui/AmbassadorSelector';
import { formatCurrency } from '@/lib/utils';
import { Users } from 'lucide-react';

interface BrokerOfferTypeSelectorProps {
  offerType: 'client' | 'ambassador';
  onTypeChange: (type: 'client' | 'ambassador') => void;
  selectedAmbassadorId: string | null;
  selectedAmbassadorName?: string;
  onAmbassadorSelect: (ambassador: AmbassadorSelectorAmbassador) => void;
  calculatedCommission?: {
    amount: number;
    rate: number;
    levelName: string;
    isCalculating: boolean;
  };
}

const BrokerOfferTypeSelector: React.FC<BrokerOfferTypeSelectorProps> = ({
  offerType,
  onTypeChange,
  selectedAmbassadorId,
  selectedAmbassadorName,
  onAmbassadorSelect,
  calculatedCommission
}) => {
  const [isAmbassadorSelectorOpen, setIsAmbassadorSelectorOpen] = useState(false);

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div>
          <Label className="text-sm font-medium mb-3 block">Type d'offre</Label>
          <RadioGroup
            value={offerType}
            onValueChange={(value) => onTypeChange(value as 'client' | 'ambassador')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="client" id="client" />
              <Label htmlFor="client" className="cursor-pointer font-normal">
                Demande client
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="ambassador" id="ambassador" />
              <Label htmlFor="ambassador" className="cursor-pointer font-normal">
                Offre ambassadeur
              </Label>
            </div>
          </RadioGroup>
        </div>

        {offerType === 'ambassador' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Ambassadeur</Label>
              <Button
                variant="outline"
                onClick={() => setIsAmbassadorSelectorOpen(true)}
                className="w-full justify-start"
              >
                <Users className="h-4 w-4 mr-2" />
                {selectedAmbassadorName || 'Sélectionner un ambassadeur'}
              </Button>
            </div>

            <AmbassadorSelector
              isOpen={isAmbassadorSelectorOpen}
              onClose={() => setIsAmbassadorSelectorOpen(false)}
              onSelectAmbassador={(ambassador) => {
                onAmbassadorSelect(ambassador);
                setIsAmbassadorSelectorOpen(false);
              }}
              selectedAmbassadorId={selectedAmbassadorId}
            />
            
            {calculatedCommission && calculatedCommission.amount > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Commission ({calculatedCommission.rate.toFixed(1)}%)
                  </span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(calculatedCommission.amount)}
                  </span>
                </div>
                {calculatedCommission.levelName && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Niveau: {calculatedCommission.levelName}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BrokerOfferTypeSelector;
