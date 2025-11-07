
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface FinancialSummaryCardProps {
  monthlyPayment: number;
  financedAmount?: number;
  totalAmount?: number;
  commission?: number;
  showCommission?: boolean;
  margin?: number;
  coefficient?: number;
  fileFee?: number;
  annualInsurance?: number;
}

const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  monthlyPayment,
  financedAmount,
  totalAmount,
  commission,
  showCommission = true,
  margin,
  coefficient,
  fileFee,
  annualInsurance
}) => {
  console.log("🔍 FinancialSummaryCard - Props received:", {
    monthlyPayment,
    financedAmount,
    totalAmount,
    commission,
    margin,
    coefficient
  });
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Résumé financier
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mensualité - Information principale */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <div>
              <div className="text-2xl font-bold text-blue-900">
                {formatCurrency(monthlyPayment)}
              </div>
              <div className="text-sm text-blue-700">Mensualité client</div>
            </div>
          </div>
        </div>

        {/* Autres informations financières */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {financedAmount && (
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-semibold text-lg">{formatCurrency(financedAmount)}</div>
              <div className="text-sm text-muted-foreground">Montant financé</div>
            </div>
          )}
          
          {totalAmount && (
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-semibold text-lg">{formatCurrency(totalAmount)}</div>
              <div className="text-sm text-muted-foreground">Montant total</div>
            </div>
          )}
          
          
          {margin !== undefined && (
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="font-semibold text-lg">{formatCurrency(margin)}</div>
              <div className="text-sm text-muted-foreground">Marge</div>
            </div>
          )}
        </div>

        {/* Frais et assurance */}
        {(fileFee !== undefined || annualInsurance !== undefined) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {fileFee !== undefined && fileFee > 0 && (
              <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="font-semibold text-lg text-orange-900">{formatCurrency(fileFee)}</div>
                <div className="text-sm text-orange-700">Frais de dossier (unique)</div>
              </div>
            )}
            
            {annualInsurance !== undefined && annualInsurance > 0 && (
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="font-semibold text-lg text-green-900">{formatCurrency(annualInsurance)}</div>
                <div className="text-sm text-green-700">Assurance annuelle</div>
              </div>
            )}
          </div>
        )}

        {/* Commission - Information importante */}
        {showCommission && commission !== undefined && (
          <div className="bg-green-50 rounded-lg p-4 border border-green-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-xl font-bold text-green-900">
                  {formatCurrency(commission)}
                </div>
                <div className="text-sm text-green-700">Votre commission</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FinancialSummaryCard;
