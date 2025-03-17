
import React, { useState } from "react";
import { BadgePercent, Check, Loader2 } from "lucide-react";
import { CommissionLevel } from "@/services/commissionService";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CommissionLevelSelectorProps {
  ambassadorId: string;
  currentLevelId?: string;
  commissionLevel: CommissionLevel | null;
  commissionLevels: CommissionLevel[];
  loading: boolean;
  onUpdateCommissionLevel: (levelId: string) => Promise<void>;
}

const CommissionLevelSelector = ({
  ambassadorId,
  currentLevelId,
  commissionLevel,
  commissionLevels,
  loading,
  onUpdateCommissionLevel,
}: CommissionLevelSelectorProps) => {
  const [updatingLevel, setUpdatingLevel] = useState(false);

  const handleUpdateCommissionLevel = async (levelId: string) => {
    if (!ambassadorId || !levelId) return;
    
    setUpdatingLevel(true);
    try {
      await onUpdateCommissionLevel(levelId);
    } finally {
      setUpdatingLevel(false);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
        <BadgePercent className="h-4 w-4 text-primary" />
        Barème de commissionnement
      </h3>
      
      <div className="p-3 rounded-lg border">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="commission-level" className="text-xs text-muted-foreground">
              Changer le barème
            </label>
            <Select
              value={currentLevelId || ""}
              onValueChange={handleUpdateCommissionLevel}
              disabled={updatingLevel}
            >
              <SelectTrigger id="commission-level" className="w-full">
                <SelectValue placeholder="Sélectionner un barème" />
              </SelectTrigger>
              <SelectContent>
                {commissionLevels.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    <div className="flex items-center gap-2">
                      {level.name}
                      {level.is_default && (
                        <Badge variant="outline" className="text-xs">Par défaut</Badge>
                      )}
                      {level.id === currentLevelId && (
                        <Check className="h-3 w-3 text-primary ml-1" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updatingLevel && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                Mise à jour en cours...
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : commissionLevel ? (
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-2">
                <div className="font-medium">{commissionLevel.name}</div>
                {commissionLevel.is_default && (
                  <Badge variant="outline" className="text-xs">Par défaut</Badge>
                )}
              </div>
              {commissionLevel.rates && commissionLevel.rates.length > 0 && (
                <div className="mt-2 space-y-1 text-sm">
                  {commissionLevel.rates
                    .sort((a, b) => b.min_amount - a.min_amount) // Sort by min_amount descending
                    .map((rate, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        <div className="text-muted-foreground">
                          {Number(rate.min_amount).toLocaleString('fr-FR')}€ - {Number(rate.max_amount).toLocaleString('fr-FR')}€
                        </div>
                        <div className="font-medium text-right">{rate.rate}%</div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-amber-600 mt-2">
              Aucun barème de commissionnement sélectionné.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommissionLevelSelector;
