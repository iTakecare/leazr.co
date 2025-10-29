import { useState, useEffect, useMemo } from 'react';
import { Leaser } from '@/types/equipment';
import { calculateAllDurations, AllDurationResults } from '@/utils/brokerCalculations';

interface UseBrokerCalculatorProps {
  calculationMode: 'purchase_price' | 'rent';
  inputAmount: number;
  selectedLeaser: Leaser | null;
  availableDurations?: number[];
}

export const useBrokerCalculator = ({
  calculationMode,
  inputAmount,
  selectedLeaser,
  availableDurations
}: UseBrokerCalculatorProps) => {
  const [calculatedResults, setCalculatedResults] = useState<AllDurationResults>({});

  const durations = useMemo(() => {
    return availableDurations || selectedLeaser?.available_durations || [18, 24, 36, 48, 60];
  }, [availableDurations, selectedLeaser]);

  useEffect(() => {
    if (inputAmount > 0 && selectedLeaser) {
      const results = calculateAllDurations(
        inputAmount,
        calculationMode,
        selectedLeaser,
        durations
      );
      setCalculatedResults(results);
    } else {
      setCalculatedResults({});
    }
  }, [calculationMode, inputAmount, selectedLeaser, durations]);

  return {
    calculatedResults,
    durations
  };
};
