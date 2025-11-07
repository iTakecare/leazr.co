import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

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
    <div className="relative flex items-center gap-2">
      {/* Cadre principal avec input pour le montant */}
      <div className="flex-1 relative h-9 px-3 border rounded-md bg-background flex items-center">
        <Input
          id="file-fee-amount"
          type="number"
          min="0"
          step="0.01"
          value={fileFeeAmount}
          onChange={(e) => onFileFeeAmountChange(parseFloat(e.target.value) || 0)}
          disabled={!fileFeeEnabled}
          className="border-0 p-0 h-7 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
        />
        <span className="text-sm text-muted-foreground ml-2">€</span>
      </div>
      
      {/* Checkbox à droite */}
      <Checkbox
        id="file-fee-enabled"
        checked={fileFeeEnabled}
        onCheckedChange={onFileFeeEnabledChange}
        className="shrink-0"
      />
    </div>
  );
};
