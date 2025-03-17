
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface CalculatorState {
  equipmentAmount: number;
  finalAmount: number;
  duration: number;
  coefficient: number;
  monthlyPayment: number;
  commission: number;
  downPayment: number;
}

interface MarginAdjusterProps {
  calculator: CalculatorState;
  updateMargin: (value: number) => void;
  saveEditing: () => void;
}

const MarginAdjuster: React.FC<MarginAdjusterProps> = ({ 
  calculator, 
  updateMargin, 
  saveEditing 
}) => {
  const [marginPercent, setMarginPercent] = useState<number>(20);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const handleSliderChange = (value: number[]) => {
    const newMargin = value[0];
    setMarginPercent(newMargin);
    updateMargin(newMargin);
  };

  const handleSave = () => {
    saveEditing();
    setIsEditing(false);
  };

  return (
    <div className="border rounded-md p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Ajustement de marge</h3>
        <Switch 
          checked={isEditing} 
          onCheckedChange={setIsEditing} 
        />
      </div>

      {isEditing && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Pourcentage de marge</Label>
              <span className="font-medium">{marginPercent}%</span>
            </div>
            <Slider
              value={[marginPercent]}
              min={0}
              max={50}
              step={0.5}
              onValueChange={handleSliderChange}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave}>
              Appliquer
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarginAdjuster;
