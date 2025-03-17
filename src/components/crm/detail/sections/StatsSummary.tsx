
import React from "react";
import { formatCurrency } from "@/utils/formatters";

interface StatsSummaryProps {
  clientsCount: number;
  commissionsTotal: number;
}

const StatsSummary = ({ clientsCount, commissionsTotal }: StatsSummaryProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="flex flex-col items-center justify-center rounded-lg border p-3">
        <div className="text-sm text-muted-foreground">Clients</div>
        <div className="text-2xl font-bold mt-1">
          {clientsCount || 0}
        </div>
      </div>
      <div className="flex flex-col items-center justify-center rounded-lg border p-3">
        <div className="text-sm text-muted-foreground">
          Commissions totales
        </div>
        <div className="text-2xl font-bold mt-1">
          {formatCurrency(commissionsTotal || 0)}
        </div>
      </div>
    </div>
  );
};

export default StatsSummary;
