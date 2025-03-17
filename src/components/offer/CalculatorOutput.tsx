
import React from 'react';
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters";

interface CalculatorState {
  equipmentAmount: number;
  finalAmount: number;
  duration: number;
  coefficient: number;
  monthlyPayment: number;
  commission: number;
  downPayment: number;
}

interface CalculatorOutputProps {
  calculator: CalculatorState;
}

const CalculatorOutput: React.FC<CalculatorOutputProps> = ({ calculator }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Montant financé</div>
        <div className="text-2xl font-bold">{formatCurrency(calculator.finalAmount)}</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Mensualité</div>
        <div className="text-2xl font-bold">{formatCurrency(calculator.monthlyPayment)}</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Coefficient</div>
        <div className="text-2xl font-bold">{calculator.coefficient.toFixed(2)}</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Commission</div>
        <div className="text-2xl font-bold">{formatCurrency(calculator.commission)}</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Durée (mois)</div>
        <div className="text-2xl font-bold">{calculator.duration}</div>
      </Card>
    </div>
  );
};

export default CalculatorOutput;
