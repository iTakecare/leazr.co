import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Leaser } from '@/types/equipment';

interface DurationSelectorProps {
  value: number;
  onChange: (value: number) => void;
  availableDurations?: number[];
  leaser?: Leaser | null;
  className?: string;
}

const DurationSelector: React.FC<DurationSelectorProps> = ({
  value,
  onChange,
  availableDurations,
  leaser,
  className = ""
}) => {
  // Utiliser les durées du leaser si disponibles, sinon les durées passées en prop, sinon les durées par défaut
  const durations = leaser?.available_durations || availableDurations || [12, 18, 24, 36, 48, 60, 72];

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor="duration">Durée de financement</Label>
      <Select value={value.toString()} onValueChange={(val) => onChange(parseInt(val))}>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionnez une durée" />
        </SelectTrigger>
        <SelectContent>
          {durations.map((duration) => (
            <SelectItem key={duration} value={duration.toString()}>
              {duration} mois
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default DurationSelector;