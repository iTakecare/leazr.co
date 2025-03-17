
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Save, Edit, Lock, Unlock } from 'lucide-react';

interface MarginAdjusterProps {
  calculator: {
    equipmentAmount: number;
    coefficient: number;
    months: number;
    finalAmount: number;
    monthlyPayment: number;
    commissionRate: number;
    commission: number;
  };
  updateMargin: (value: number) => void;
  saveEditing: () => void;
}

const MarginAdjuster: React.FC<MarginAdjusterProps> = ({
  calculator,
  updateMargin,
  saveEditing
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [margin, setMargin] = useState(20); // Default margin percentage
  const [isLocked, setIsLocked] = useState(true);

  const handleMarginChange = (value: number[]) => {
    const newMargin = value[0];
    setMargin(newMargin);
    updateMargin(newMargin);
  };

  const toggleEditing = () => {
    if (isEditing) {
      saveEditing();
    }
    setIsEditing(!isEditing);
  };

  const toggleLock = () => {
    setIsLocked(!isLocked);
  };

  return (
    <div className="bg-muted/50 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-medium">Ajustement de la marge</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLock}
          >
            {isLocked ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                <span className="sr-only">Verrouillé</span>
              </>
            ) : (
              <>
                <Unlock className="h-4 w-4 mr-2" />
                <span className="sr-only">Déverrouillé</span>
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleEditing}
          >
            {isEditing ? (
              <>
                <Save className="h-4 w-4 mr-2" />
                <span>Enregistrer</span>
              </>
            ) : (
              <>
                <Edit className="h-4 w-4 mr-2" />
                <span>Modifier</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {isEditing && (
        <div className="space-y-4">
          <div>
            <div className="mb-2 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Marge (%)</span>
              <span className="font-medium">{margin}%</span>
            </div>
            <Slider
              defaultValue={[margin]}
              min={0}
              max={50}
              step={1}
              onValueChange={handleMarginChange}
              disabled={isLocked}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MarginAdjuster;
