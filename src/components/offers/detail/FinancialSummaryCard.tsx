
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calendar, Wallet } from "lucide-react";
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
  downPayment?: number;
  discountType?: string;
  discountValue?: number;
  discountAmount?: number;
  monthlyPaymentBeforeDiscount?: number;
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
  annualInsurance,
  downPayment,
  discountType,
  discountValue,
  discountAmount,
  monthlyPaymentBeforeDiscount
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
        {discountAmount && discountAmount > 0 ? (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-2">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div>
                <div className="text-lg text-blue-700 line-through opacity-70">
                  {formatCurrency(monthlyPaymentBeforeDiscount || monthlyPayment)}
                </div>
                <div className="text-sm text-red-600 font-medium">
                  🏷️ Remise {discountType === 'percentage' ? `(${discountValue}%)` : ''} : -{formatCurrency(discountAmount)}
                </div>
                <div className="text-2xl font-bold text-blue-900">
                  {formatCurrency((monthlyPaymentBeforeDiscount || monthlyPayment) - discountAmount)}
                </div>
                <div className="text-sm text-blue-700">Mensualité client (après remise)</div>
              </div>
            </div>
          </div>
        ) : (
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
        )}

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

        {/* Acompte */}
        {downPayment !== undefined && downPayment > 0 && (
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center gap-3">
              <Wallet className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-xl font-bold text-amber-900">
                  {formatCurrency(downPayment)}
                </div>
                <div className="text-sm text-amber-700">Acompte versé</div>
              </div>
            </div>
            {financedAmount && (
              <div className="mt-2 text-sm text-amber-700">
                Montant financé après acompte : <span className="font-semibold">{formatCurrency(financedAmount - downPayment)}</span>
              </div>
            )}
          </div>
        )}

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
