
import React from 'react';
import { formatCurrency } from "@/utils/formatters";
import { Contract } from '@/services/contracts';

interface ContractSummaryProps {
  contracts: Contract[];
}

const ContractSummary: React.FC<ContractSummaryProps> = ({ contracts }) => {
  const totalMonthlyValue = contracts.reduce(
    (total, contract) => total + contract.monthly_payment,
    0
  );

  return (
    <div className="mt-6 text-sm text-muted-foreground">
      <p>
        Valeur mensuelle totale:{" "}
        <span className="font-medium text-foreground">
          {formatCurrency(totalMonthlyValue)}
        </span>
      </p>
    </div>
  );
};

export default ContractSummary;
