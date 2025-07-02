import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Calculator, Euro, Percent } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { hasCommission } from "@/utils/offerTypeTranslator";
interface FinancialSectionProps {
  offer: any;
}
const FinancialSection: React.FC<FinancialSectionProps> = ({
  offer
}) => {
  // Vérifier si ce type d'offre a une commission
  const shouldShowCommission = hasCommission(offer.type);

  // Calculer les totaux des équipements si disponibles
  const calculateEquipmentTotals = () => {
    // Essayer de parser les équipements depuis equipment_description
    let equipmentList = [];
    if (offer.equipment_description) {
      try {
        const parsedEquipment = JSON.parse(offer.equipment_description);
        if (Array.isArray(parsedEquipment)) {
          equipmentList = parsedEquipment;
        }
      } catch (e) {
        console.warn("Could not parse equipment_description as JSON");
      }
    }

    // Si on a des équipements parsés, calculer depuis ces données
    if (equipmentList.length > 0) {
      return equipmentList.reduce((acc: any, item: any) => {
        // Utiliser purchasePrice ou purchase_price pour le prix d'achat
        const purchasePrice = parseFloat(item.purchasePrice || item.purchase_price) || 0;
        const quantity = parseInt(item.quantity) || 1;
        // Utiliser monthlyPayment ou monthly_payment pour la mensualité
        const monthlyPayment = parseFloat(item.monthlyPayment || item.monthly_payment) || 0;
        return {
          totalPurchasePrice: acc.totalPurchasePrice + purchasePrice * quantity,
          totalMonthlyPayment: acc.totalMonthlyPayment + monthlyPayment * quantity
        };
      }, {
        totalPurchasePrice: 0,
        totalMonthlyPayment: 0
      });
    }

    // Sinon, utiliser les données de l'offre comme fallback
    return {
      totalPurchasePrice: offer.financed_amount || 0,
      // Utiliser financed_amount au lieu de amount
      totalMonthlyPayment: offer.monthly_payment || 0
    };
  };
  const totals = calculateEquipmentTotals();
  const financedAmount = offer.financed_amount || totals.totalPurchasePrice + (offer.margin || 0);

  // Calculer le pourcentage de marge
  const marginPercentage = totals.totalPurchasePrice > 0 ? (offer.margin || 0) / totals.totalPurchasePrice * 100 : 0;

  // La marge est toujours affichée, seule la commission est conditionnelle
  const displayMargin = offer.margin || 0;
  const displayCommission = shouldShowCommission ? offer.commission || 0 : 0;
  return <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
        <CardTitle className="flex items-center gap-3 text-xl font-semibold text-gray-800">
          <DollarSign className="w-6 h-6 text-blue-600" />
          Résumé financier
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        
        {/* Principales métriques - Layout en 3 colonnes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          
          {/* Montant total d'achat */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Euro className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Montant total d'achat</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-blue-900 mb-1">
              {formatCurrency(totals.totalPurchasePrice)}
            </div>
            <div className="text-xs text-blue-600">
              Prix d'achat des équipements
            </div>
          </div>
          
          {/* Mensualité totale */}
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Mensualité totale</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-green-900 mb-1">
              {formatCurrency(totals.totalMonthlyPayment)}
            </div>
            <div className="text-xs text-green-600">
              Paiement mensuel client
            </div>
          </div>
          
          {/* Marge totale - Toujours affichée */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Marge totale</span>
              </div>
            </div>
            <div className="text-2xl font-bold text-purple-900 mb-1">
              {formatCurrency(displayMargin)}
            </div>
            <div className="text-xs text-purple-600 flex items-center gap-1">
              <Percent className="w-3 h-3" />
              {marginPercentage.toFixed(1)}% du prix d'achat
            </div>
          </div>
        </div>

        {/* Informations complémentaires */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
          
          {/* Montant financé */}
          {financedAmount > 0 && financedAmount !== totals.totalPurchasePrice && <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <Euro className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Montant financé</span>
              </div>
              <span className="text-lg font-bold text-gray-900">
                {formatCurrency(financedAmount)}
              </span>
            </div>}

          {/* Coefficient */}
          {offer.coefficient && <div className="flex items-center justify-between p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Coefficient appliqué</span>
              </div>
              <span className="text-lg font-bold text-orange-900">
                {offer.coefficient}
              </span>
            </div>}

          {/* Commission - Conditionnelle selon le type d'offre */}
          {shouldShowCommission && <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-medium text-emerald-700">Commission</span>
              </div>
              <span className="text-lg font-bold text-emerald-900">
                {formatCurrency(displayCommission)}
              </span>
            </div>}
        </div>

        {/* Statuts et informations additionnelles */}
        {(offer.commission_status || offer.margin_difference || offer.commission_paid_at) && shouldShowCommission && <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-4">
              {offer.commission_status && <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Statut commission:</span>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${offer.commission_status === 'pending' ? 'bg-yellow-100 text-yellow-800' : offer.commission_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                    {offer.commission_status === 'pending' ? 'En attente' : offer.commission_status === 'paid' ? 'Payée' : offer.commission_status}
                  </span>
                </div>}

              {offer.margin_difference && Math.abs(offer.margin_difference) > 0.01 && <div className="flex items-center gap-2">
                  
                  
                </div>}

              {offer.commission_paid_at && <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Commission payée le:</span>
                  <span className="text-sm font-medium px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                    {new Date(offer.commission_paid_at).toLocaleDateString('fr-FR')}
                  </span>
                </div>}
            </div>
          </div>}
      </CardContent>
    </Card>;
};
export default FinancialSection;