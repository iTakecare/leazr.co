import React from 'react';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface DurationSelectorProps {
  availableDurations: number[];
  onDurationsChange: (durations: number[]) => void;
  className?: string;
}

const STANDARD_DURATIONS = [12, 18, 24, 36, 48, 60, 72];

const DurationSelector: React.FC<DurationSelectorProps> = ({
  availableDurations,
  onDurationsChange,
  className = ""
}) => {
  const handleDurationToggle = (duration: number, checked: boolean) => {
    if (checked) {
      onDurationsChange([...availableDurations, duration].sort((a, b) => a - b));
    } else {
      onDurationsChange(availableDurations.filter(d => d !== duration));
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <Label className="text-base font-medium">Durées de financement disponibles</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Sélectionnez les durées que ce leaser propose
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STANDARD_DURATIONS.map((duration) => {
          const isChecked = availableDurations.includes(duration);
          return (
            <div key={duration} className="flex items-center space-x-2">
              <Checkbox
                id={`duration-${duration}`}
                checked={isChecked}
                onCheckedChange={(checked) => handleDurationToggle(duration, !!checked)}
              />
              <Label 
                htmlFor={`duration-${duration}`} 
                className="text-sm cursor-pointer flex items-center gap-1"
              >
                {duration} mois
                {isChecked && <Badge variant="secondary" className="text-xs">✓</Badge>}
              </Label>
            </div>
          );
        })}
      </div>
      
      {availableDurations.length === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-md border border-amber-200">
          ⚠️ Aucune durée sélectionnée. Le leaser ne pourra pas être utilisé dans les offres.
        </p>
      )}
      
      {availableDurations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-sm text-muted-foreground">Durées sélectionnées:</span>
          {availableDurations.map(duration => (
            <Badge key={duration} variant="outline" className="text-xs">
              {duration}m
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default DurationSelector;