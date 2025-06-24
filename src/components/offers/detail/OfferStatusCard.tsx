
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { format } from "date-fns";

interface OfferStatusCardProps {
  status: string;
  createdAt: string;
  lastUpdated?: string;
  signedAt?: string | null;
  signerName?: string | null;
}

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'draft':
      return {
        label: 'Brouillon',
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: Clock,
        iconColor: 'text-gray-500'
      };
    case 'sent':
      return {
        label: 'Envoyée au client',
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Clock,
        iconColor: 'text-blue-500'
      };
    case 'approved':
      return {
        label: 'Signée par le client',
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: CheckCircle,
        iconColor: 'text-green-500'
      };
    case 'valid_itc':
      return {
        label: 'Validée ITC',
        color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle,
        iconColor: 'text-emerald-500'
      };
    case 'financed':
      return {
        label: 'Financée',
        color: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: CheckCircle,
        iconColor: 'text-purple-500'
      };
    case 'rejected':
      return {
        label: 'Rejetée',
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
        iconColor: 'text-red-500'
      };
    case 'info_requested':
      return {
        label: 'Informations demandées',
        color: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: AlertCircle,
        iconColor: 'text-orange-500'
      };
    default:
      return {
        label: status,
        color: 'bg-gray-100 text-gray-800 border-gray-200',
        icon: Clock,
        iconColor: 'text-gray-500'
      };
  }
};

const OfferStatusCard: React.FC<OfferStatusCardProps> = ({
  status,
  createdAt,
  lastUpdated,
  signedAt,
  signerName
}) => {
  const config = getStatusConfig(status);
  const StatusIcon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <StatusIcon className={`h-5 w-5 ${config.iconColor}`} />
          Statut de l'offre
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-center">
          <Badge className={`${config.color} px-4 py-2 text-sm font-medium`}>
            {config.label}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex justify-between">
            <span>Créée le:</span>
            <span className="font-medium text-foreground">
              {format(new Date(createdAt), 'dd/MM/yyyy à HH:mm')}
            </span>
          </div>
          
          {lastUpdated && (
            <div className="flex justify-between">
              <span>Dernière modification:</span>
              <span className="font-medium text-foreground">
                {format(new Date(lastUpdated), 'dd/MM/yyyy à HH:mm')}
              </span>
            </div>
          )}
          
          {signedAt && (
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Signée le:</span>
                <span className="font-medium text-green-700">
                  {format(new Date(signedAt), 'dd/MM/yyyy à HH:mm')}
                </span>
              </div>
              {signerName && (
                <div className="flex justify-between">
                  <span>Signataire:</span>
                  <span className="font-medium text-foreground">{signerName}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OfferStatusCard;
