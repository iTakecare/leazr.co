
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calculator, Euro } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface FinancialSectionProps {
  offer: any;
}

const FinancialSection: React.FC<FinancialSectionProps> = ({ offer }) => {
  // Calculer les totaux des équipements si disponibles
  const calculateEquipmentTotals = () => {
    if (!offer.parsedEquipment || offer.parsedEquipment.length === 0) {
      return {
        totalPurchasePrice: offer.amount || 0,
        totalMargin: offer.margin || offer.total_margin_with_difference || 0,
        totalMonthlyPayment: offer.monthly_payment || 0
      };
    }

    const totals = offer.parsedEquipment.reduce((acc: any, item: any) => {
      const purchasePrice = parseFloat(item.purchasePrice) || 0;
      const quantity = parseInt(item.quantity) || 1;
      const margin = parseFloat(item.margin) || 0;
      const monthlyPayment = parseFloat(item.monthlyPayment) || 0;

      return {
        totalPurchasePrice: acc.totalPurchasePrice + (purchasePrice * quantity),
        totalMargin: acc.totalMargin + (margin * quantity),
        totalMonthlyPayment: acc.totalMonthlyPayment + (monthlyPayment * quantity)
      };
    }, { totalPurchasePrice: 0, totalMargin: 0, totalMonthlyPayment: 0 });

    return totals;
  };

  const totals = calculateEquipmentTotals();
  const financedAmount = offer.financed_amount || (totals.totalPurchasePrice + totals.totalMargin);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="w-5 h-5 text-green-600" />
          Résumé financier
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Layout en 3 colonnes pour optimiser l'espace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Montants principaux */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Euro className="w-4 h-4" />
              Montants principaux
            </h3>
            
            <div className="space-y-2">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="text-lg font-bold text-blue-900">
                  {formatCurrency(totals.totalPurchasePrice)}
                </div>
                <div className="text-xs text-blue-700">Montant total</div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <div className="text-lg font-bold text-green-900">
                  {formatCurrency(totals.totalMonthlyPayment)}
                </div>
                <div className="text-xs text-green-700">Mensualité</div>
              </div>
              
              {financedAmount > 0 && financedAmount !== totals.totalPurchasePrice && (
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="text-sm font-semibold text-gray-900">
                    {formatCurrency(financedAmount)}
                  </div>
                  <div className="text-xs text-gray-600">Montant financé</div>
                </div>
              )}
            </div>
          </div>

          {/* Marges & Coefficients */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Marges & Coefficients
            </h3>
            
            <div className="space-y-2">
              {offer.coefficient && (
                <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                  <div className="text-lg font-bold text-orange-900">
                    {offer.coefficient}
                  </div>
                  <div className="text-xs text-orange-700">Coefficient</div>
                </div>
              )}
              
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <div className="text-lg font-bold text-purple-900">
                  {formatCurrency(totals.totalMargin)}
                </div>
                <div className="text-xs text-purple-700">Marge offre</div>
              </div>

              {offer.margin_difference && Math.abs(offer.margin_difference) > 0.01 && (
                <div className={`rounded-lg p-3 border ${
                  offer.margin_difference > 0 
                    ? 'bg-red-50 border-red-100' 
                    : 'bg-green-50 border-green-100'
                }`}>
                  <div className={`text-sm font-semibold ${
                    offer.margin_difference > 0 ? 'text-red-900' : 'text-green-900'
                  }`}>
                    {offer.margin_difference > 0 ? '-' : '+'}{formatCurrency(Math.abs(offer.margin_difference))}
                  </div>
                  <div className={`text-xs ${
                    offer.margin_difference > 0 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    Ajustement marge
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Commission */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-700 flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Commission
            </h3>
            
            <div className="space-y-2">
              {offer.commission && (
                <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
                  <div className="text-lg font-bold text-emerald-900">
                    {formatCurrency(offer.commission)}
                  </div>
                  <div className="text-xs text-emerald-700">Commission</div>
                </div>
              )}
              
              {offer.commission_status && (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-100">
                  <div className="text-sm font-medium text-yellow-900 capitalize">
                    {offer.commission_status === 'pending' ? 'En attente' : 
                     offer.commission_status === 'paid' ? 'Payée' : 
                     offer.commission_status}
                  </div>
                  <div className="text-xs text-yellow-700">Statut commission</div>
                </div>
              )}

              {offer.commission_paid_at && (
                <div className="text-xs text-gray-500">
                  Payée le {new Date(offer.commission_paid_at).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSection;
