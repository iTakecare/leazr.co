import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FileFeeConfigurationProps {
  fileFeeEnabled: boolean;
  fileFeeAmount: number;
  onFileFeeEnabledChange: (enabled: boolean) => void;
  onFileFeeAmountChange: (amount: number) => void;
}

export const FileFeeConfiguration: React.FC<FileFeeConfigurationProps> = ({
  fileFeeEnabled,
  fileFeeAmount,
  onFileFeeEnabledChange,
  onFileFeeAmountChange,
}) => {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-background">
        <Checkbox
          id="file-fee-enabled"
          checked={fileFeeEnabled}
          onCheckedChange={onFileFeeEnabledChange}
        />
        <Label 
          htmlFor="file-fee-enabled" 
          className="text-sm cursor-pointer"
        >
          Activé
        </Label>
      </div>
      
      {fileFeeEnabled && (
        <div className="space-y-1">
          <Label htmlFor="file-fee-amount" className="text-xs text-muted-foreground">
            Montant (HTVA)
          </Label>
          <div className="relative">
            <Input
              id="file-fee-amount"
              type="number"
              min="0"
              step="0.01"
              value={fileFeeAmount}
              onChange={(e) => onFileFeeAmountChange(parseFloat(e.target.value) || 0)}
              className="pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              €
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
