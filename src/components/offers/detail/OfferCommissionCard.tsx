
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters";
import { DollarSign, CheckCircle, Clock, XCircle } from "lucide-react";

interface OfferCommissionCardProps {
  commission: number;
  commissionStatus?: string;
  offerType: string;
}

const OfferCommissionCard: React.FC<OfferCommissionCardProps> = ({
  commission,
  commissionStatus = 'pending',
  offerType
}) => {
  // Only show for ambassador offers
  if (offerType !== 'ambassador_offer') {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="mr-1 h-3 w-3" />
            Payée
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="mr-1 h-3 w-3" />
            En attente
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <XCircle className="mr-1 h-3 w-3" />
            Annulée
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        );
    }
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          Commission Ambassadeur
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Montant:</span>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(commission || 0)}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Statut:</span>
          {getStatusBadge(commissionStatus)}
        </div>
      </CardContent>
    </Card>
  );
};

export default OfferCommissionCard;
