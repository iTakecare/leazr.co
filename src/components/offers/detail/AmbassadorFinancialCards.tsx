
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Euro, TrendingUp, Calculator } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";

interface FinancialCardsProps {
  monthlyPayment: number;
  commission?: number;
  commissionStatus?: string;
  margin?: number;
  marginPercentage?: number;
  showCommission?: boolean;
  showMargin?: boolean;
}

const AmbassadorFinancialCards: React.FC<FinancialCardsProps> = ({
  monthlyPayment,
  commission,
  commissionStatus,
  margin,
  marginPercentage,
  showCommission = false,
  showMargin = false
}) => {
  const getCommissionStatusBadge = (status: string | undefined) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">Payée</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800">En attente</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Annulée</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status || 'Non défini'}</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Mensualité - Toujours visible */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center text-blue-700">
            <Euro className="h-5 w-5 mr-2" />
            Mensualité client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-blue-900">
            {formatCurrency(monthlyPayment)}
            <span className="text-sm font-normal text-blue-600">/mois</span>
          </div>
        </CardContent>
      </Card>

      {/* Commission - Si applicable */}
      {showCommission && (
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center text-green-700">
              <TrendingUp className="h-5 w-5 mr-2" />
              Votre commission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-900">
              {formatCurrency(commission || 0)}
            </div>
            {commissionStatus && (
              <div className="mt-2">{getCommissionStatusBadge(commissionStatus)}</div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Marge - Si visible pour admin */}
      {showMargin && (
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center text-purple-700">
              <Calculator className="h-5 w-5 mr-2" />
              Marge générée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-900">
              {formatCurrency(margin || 0)}
            </div>
            <div className="text-sm text-purple-600 mt-1">
              {marginPercentage}% de marge
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AmbassadorFinancialCards;
