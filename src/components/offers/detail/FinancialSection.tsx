
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
        totalPurchasePrice: 0, // Utiliser 0 au lieu de offer.amount
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <DollarSign className="w-5 h-5 text-green-600" />
          Résumé financier
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Layout en grille responsive pour une meilleure utilisation de l'espace horizontal */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          
          {/* Montant total */}
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
            <div className="flex items-center gap-2 mb-1">
              <Euro className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">Montant total</span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              {formatCurrency(totals.totalPurchasePrice)}
            </div>
          </div>
          
          {/* Mensualité */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700 font-medium">Mensualité</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              {formatCurrency(totals.totalMonthlyPayment)}
            </div>
          </div>
          
          {/* Coefficient */}
          {offer.coefficient && (
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-orange-600" />
                <span className="text-xs text-orange-700 font-medium">Coefficient</span>
              </div>
              <div className="text-lg font-bold text-orange-900">
                {offer.coefficient}
              </div>
            </div>
          )}
          
          {/* Marge offre */}
          <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-700 font-medium">Marge offre</span>
            </div>
            <div className="text-lg font-bold text-purple-900">
              {formatCurrency(totals.totalMargin)}
            </div>
          </div>

          {/* Commission */}
          {offer.commission && (
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100">
              <div className="flex items-center gap-2 mb-1">
                <Calculator className="w-4 h-4 text-emerald-600" />
                <span className="text-xs text-emerald-700 font-medium">Commission</span>
              </div>
              <div className="text-lg font-bold text-emerald-900">
                {formatCurrency(offer.commission)}
              </div>
            </div>
          )}

          {/* Montant financé */}
          {financedAmount > 0 && financedAmount !== totals.totalPurchasePrice && (
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-1">
                <Euro className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-600 font-medium">Montant financé</span>
              </div>
              <div className="text-lg font-bold text-gray-900">
                {formatCurrency(financedAmount)}
              </div>
            </div>
          )}
        </div>

        {/* Informations supplémentaires en ligne */}
        <div className="flex flex-wrap gap-4 pt-2 border-t border-gray-100">
          {offer.commission_status && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Statut commission:</span>
              <span className={`text-sm font-medium px-2 py-1 rounded ${
                offer.commission_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                offer.commission_status === 'paid' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {offer.commission_status === 'pending' ? 'En attente' : 
                 offer.commission_status === 'paid' ? 'Payée' : 
                 offer.commission_status}
              </span>
            </div>
          )}

          {offer.margin_difference && Math.abs(offer.margin_difference) > 0.01 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Ajustement marge:</span>
              <span className={`text-sm font-medium px-2 py-1 rounded ${
                offer.margin_difference > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {offer.margin_difference > 0 ? '-' : '+'}{formatCurrency(Math.abs(offer.margin_difference))}
              </span>
            </div>
          )}

          {offer.commission_paid_at && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Commission payée le:</span>
              <span className="text-sm font-medium">
                {new Date(offer.commission_paid_at).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSection;
