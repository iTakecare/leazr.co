import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DurationCoefficient } from '@/types/equipment';
import { getInternalCoefficientForDuration } from '@/utils/equipmentCalculations';
import { Info } from 'lucide-react';

interface LeaserDurationMatrixProps {
  ranges: Array<{
    id: string;
    min: number;
    max: number;
    coefficient?: number;
    duration_coefficients?: DurationCoefficient[];
  }>;
  availableDurations: number[];
  onCoefficientChange: (rangeId: string, duration: number, coefficient: number) => void;
  isOwnCompany?: boolean;
}

const LeaserDurationMatrix: React.FC<LeaserDurationMatrixProps> = ({
  ranges,
  availableDurations,
  onCoefficientChange,
  isOwnCompany = false
}) => {
  const getCoefficientForRange = (range: any, duration: number): number => {
    // Pour le leasing en propre, utiliser les coefficients internes (amortissement linéaire)
    if (isOwnCompany) {
      return getInternalCoefficientForDuration(duration);
    }
    
    if (range.duration_coefficients) {
      const durationCoeff = range.duration_coefficients.find(
        (dc: DurationCoefficient) => dc.duration_months === duration
      );
      if (durationCoeff) {
        return durationCoeff.coefficient;
      }
    }
    return range.coefficient || 3.55;
  };

  return (
    <div className="space-y-4">
      <Label className="text-lg font-medium">Matrice des coefficients par durée</Label>
      
      {isOwnCompany && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
          <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Leasing en propre</strong> : Les coefficients sont calculés automatiquement 
            selon la formule d'amortissement linéaire (100 ÷ durée en mois).
          </div>
        </div>
      )}
      
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-muted/50 border-b">
          <div className="grid grid-cols-3 gap-0">
            <div className="p-3 border-r font-medium">Tranches (€)</div>
            <div className="col-span-2 grid gap-0" style={{ gridTemplateColumns: `repeat(${availableDurations.length}, 1fr)` }}>
              {availableDurations.map((duration) => (
                <div key={duration} className="p-3 border-r last:border-r-0 text-center font-medium text-sm">
                  {duration} mois
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="divide-y">
          {ranges.map((range, rangeIndex) => (
            <div key={range.id} className="grid grid-cols-3 gap-0">
              <div className="p-3 border-r bg-muted/25 flex items-center">
                <span className="text-sm">
                  {range.min.toLocaleString()} - {range.max.toLocaleString()}
                </span>
              </div>
              <div className="col-span-2 grid gap-0" style={{ gridTemplateColumns: `repeat(${availableDurations.length}, 1fr)` }}>
                {availableDurations.map((duration) => (
                  <div key={duration} className="p-2 border-r last:border-r-0">
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      value={getCoefficientForRange(range, duration)}
                      onChange={(e) => onCoefficientChange(range.id, duration, parseFloat(e.target.value) || 0)}
                      className={`text-center text-sm h-8 ${isOwnCompany ? 'bg-muted cursor-not-allowed' : ''}`}
                      placeholder="0.000"
                      disabled={isOwnCompany}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground">
        {isOwnCompany 
          ? "Les coefficients internes sont basés sur un amortissement linéaire sans intérêts ni marge."
          : "Ajustez les coefficients selon la durée de financement pour chaque tranche de montant. Les coefficients sont exprimés en pourcentage du montant financé."
        }
      </p>
    </div>
  );
};

export default LeaserDurationMatrix;