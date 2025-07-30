import React from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Leaser } from "@/types/equipment";

interface DurationButtonProps {
  selectedDuration: number;
  onDurationChange: (duration: number) => void;
  leaser: Leaser | null;
}

const DurationButton: React.FC<DurationButtonProps> = ({ 
  selectedDuration, 
  onDurationChange, 
  leaser 
}) => {
  // Utiliser les durées du leaser si disponibles, sinon les durées par défaut
  const availableDurations = leaser?.available_durations || [12, 18, 24, 36, 48, 60, 72];
  
  // Si aucun leaser sélectionné, désactiver le sélecteur
  const isDisabled = !leaser;

  return (
    <Select 
      value={selectedDuration?.toString() || "36"} 
      onValueChange={(val) => onDurationChange(parseInt(val))}
      disabled={isDisabled}
    >
      <SelectTrigger className="flex justify-between items-center h-10 w-full px-3 py-2">
        <div className="flex items-center min-w-0 flex-1">
          <Clock className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
          <div className="text-left min-w-0 flex-1">
            <SelectValue placeholder="Durée">
              {selectedDuration ? `${selectedDuration} mois` : "Sélectionner"}
            </SelectValue>
          </div>
        </div>
        <span className="text-xs text-muted-foreground ml-2 flex-shrink-0">•••</span>
      </SelectTrigger>
      <SelectContent>
        {availableDurations.map((duration) => (
          <SelectItem key={duration} value={duration.toString()}>
            {duration} mois
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default DurationButton;