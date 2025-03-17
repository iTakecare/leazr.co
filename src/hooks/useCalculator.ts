
import { useState, useEffect } from 'react';

interface CalculatorInputs {
  equipmentAmount?: number;
  coefficient?: number;
  months?: number;
  commissionRate?: number;
}

interface CalculatorState {
  equipmentAmount: number;
  coefficient: number;
  months: number;
  finalAmount: number;
  monthlyPayment: number;
  commissionRate: number;
  commission: number;
}

export function useCalculator() {
  const [calculator, setCalculator] = useState<CalculatorState>({
    equipmentAmount: 0,
    coefficient: 2.1, // Default coefficient
    months: 60, // Default period in months
    finalAmount: 0,
    monthlyPayment: 0,
    commissionRate: 3, // Default commission rate percentage
    commission: 0
  });

  // Calculate the final amount and monthly payment when inputs change
  useEffect(() => {
    const finalAmount = calculator.equipmentAmount * (1 + calculator.coefficient / 100);
    const monthlyPayment = finalAmount / calculator.months;
    const commission = (calculator.commissionRate / 100) * finalAmount;

    setCalculator(prev => ({
      ...prev,
      finalAmount,
      monthlyPayment,
      commission
    }));
  }, [calculator.equipmentAmount, calculator.coefficient, calculator.months, calculator.commissionRate]);

  // Function to update calculator inputs
  const calculate = (inputs: CalculatorInputs) => {
    setCalculator(prev => ({
      ...prev,
      ...inputs
    }));
  };

  return { calculator, calculate };
}
