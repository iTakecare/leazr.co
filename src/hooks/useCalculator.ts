
import { useState } from 'react';

interface CalculatorInputs {
  equipmentAmount: number;
  duration?: number;
  downPayment?: number;
}

interface CalculatorState {
  equipmentAmount: number;
  finalAmount: number;
  duration: number;
  coefficient: number;
  monthlyPayment: number;
  commission: number;
  downPayment: number;
}

export function useCalculator() {
  const [calculator, setCalculator] = useState<CalculatorState>({
    equipmentAmount: 0,
    finalAmount: 0,
    duration: 60, // Default duration in months
    coefficient: 2.1, // Default coefficient
    monthlyPayment: 0,
    commission: 0,
    downPayment: 0
  });

  const calculate = (inputs: CalculatorInputs) => {
    const duration = inputs.duration || calculator.duration;
    const downPayment = inputs.downPayment || 0;
    
    const equipmentAmount = inputs.equipmentAmount;
    const finalAmount = equipmentAmount - downPayment;
    
    // Apply coefficient to calculate monthly payment
    // Coefficient is a percentage of the amount financed
    const monthlyPayment = (finalAmount * calculator.coefficient) / 100;
    
    // Calculate commission (5% of financed amount as an example)
    const commission = finalAmount * 0.05;
    
    setCalculator({
      ...calculator,
      equipmentAmount,
      finalAmount,
      duration,
      monthlyPayment,
      commission,
      downPayment
    });

    return { monthlyPayment, commission };
  };

  return { calculate, calculator };
}
