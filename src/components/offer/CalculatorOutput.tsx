
import React from 'react';
import { Card } from '@/components/ui/card';

interface CalculatorProps {
  calculator: {
    equipmentAmount: number;
    coefficient: number;
    months: number;
    finalAmount: number;
    monthlyPayment: number;
    commissionRate: number;
    commission: number;
  };
}

const CalculatorOutput: React.FC<CalculatorProps> = ({ calculator }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Montant équipement</div>
        <div className="text-xl font-medium">{formatCurrency(calculator.equipmentAmount)}</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Coefficient</div>
        <div className="text-xl font-medium">{calculator.coefficient.toFixed(2)}%</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Montant financé</div>
        <div className="text-xl font-medium">{formatCurrency(calculator.finalAmount)}</div>
      </Card>
      
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Mensualité</div>
        <div className="text-xl font-medium">{formatCurrency(calculator.monthlyPayment)}</div>
      </Card>
    </div>
  );
};

export default CalculatorOutput;
