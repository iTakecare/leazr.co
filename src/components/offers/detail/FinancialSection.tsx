
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Euro, TrendingUp, Percent } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { hasCommission } from "@/utils/offerTypeTranslator";

interface FinancialSectionProps {
  offer: any;
}

const FinancialSection: React.FC<FinancialSectionProps> = ({ offer }) => {
  const shouldShowCommission = hasCommission(offer.type);
  const calculatedMargin = offer?.amount && offer?.financed_amount
    ? offer.amount - offer.financed_amount
    : 0;
  const marginPercentage = offer?.amount && offer?.financed_amount && offer?.amount > 0
    ? parseFloat(((calculatedMargin / offer.financed_amount) * 100).toFixed(2))
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Résumé financier
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700 border-b pb-2">Montants principaux</h4>
            
            <div className="flex items-center gap-3">
              <Euro className="w-4 h-4 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">Montant total</p>
                <p className="text-lg font-semibold">{formatCurrency(offer.amount || 0)}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Euro className="w-4 h-4 text-green-500" />
              <div>
                <p className="text-sm text-gray-500">Mensualité</p>
                <p className="text-lg font-semibold">{formatCurrency(offer.monthly_payment || 0)}</p>
              </div>
            </div>
            
            {offer.financed_amount && (
              <div className="flex items-center gap-3">
                <Euro className="w-4 h-4 text-purple-500" />
                <div>
                  <p className="text-sm text-gray-500">Montant financé</p>
                  <p className="text-lg font-semibold">{formatCurrency(offer.financed_amount)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-700 border-b pb-2">Marges & Coefficients</h4>
            
            {offer.coefficient && (
              <div className="flex items-center gap-3">
                <Percent className="w-4 h-4 text-orange-500" />
                <div>
                  <p className="text-sm text-gray-500">Coefficient</p>
                  <p className="text-lg font-semibold">{offer.coefficient}</p>
                </div>
              </div>
            )}
            
            {calculatedMargin > 0 && (
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-teal-500" />
                <div>
                  <p className="text-sm text-gray-500">Marge calculée</p>
                  <p className="text-lg font-semibold">{formatCurrency(calculatedMargin)}</p>
                  {marginPercentage > 0 && (
                    <p className="text-sm text-gray-400">({marginPercentage}%)</p>
                  )}
                </div>
              </div>
            )}
            
            {offer.margin && (
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-indigo-500" />
                <div>
                  <p className="text-sm text-gray-500">Marge offre</p>
                  <p className="text-lg font-semibold">{formatCurrency(offer.margin)}</p>
                </div>
              </div>
            )}
          </div>

          {shouldShowCommission && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-700 border-b pb-2">Commission</h4>
              
              <div className="flex items-center gap-3">
                <Euro className="w-4 h-4 text-yellow-500" />
                <div>
                  <p className="text-sm text-gray-500">Commission</p>
                  <p className="text-lg font-semibold">{formatCurrency(offer.commission || 0)}</p>
                </div>
              </div>
              
              {offer.commission_status && (
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    offer.commission_status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <p className="text-sm text-gray-500">Statut commission</p>
                    <p className="font-medium capitalize">{offer.commission_status}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default FinancialSection;
