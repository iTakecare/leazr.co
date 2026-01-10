import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Euro, Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { ClientOffer } from "@/hooks/useClientOffers";

interface ClientOfferCardProps {
  offer: ClientOffer;
}

const getStatusBadge = (status: string, workflowStatus?: string) => {
  const displayStatus = workflowStatus || status;
  
  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
    pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800" },
    sent: { label: "Envoyée", className: "bg-blue-100 text-blue-800" },
    approved: { label: "Acceptée", className: "bg-green-100 text-green-800" },
    rejected: { label: "Refusée", className: "bg-red-100 text-red-800" },
    signed: { label: "Signée", className: "bg-emerald-100 text-emerald-800" },
    leaser_review: { label: "En revue leaser", className: "bg-purple-100 text-purple-800" },
    leaser_approved: { label: "Approuvée leaser", className: "bg-indigo-100 text-indigo-800" },
    info_requested: { label: "Info demandée", className: "bg-orange-100 text-orange-800" },
  };

  const config = statusConfig[displayStatus] || { label: displayStatus, className: "bg-muted text-muted-foreground" };
  
  return <Badge className={`${config.className} hover:${config.className}`}>{config.label}</Badge>;
};

const ClientOfferCard: React.FC<ClientOfferCardProps> = ({ offer }) => {
  const navigate = useNavigate();

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd MMM yyyy", { locale: fr });
    } catch {
      return "N/A";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { 
      style: 'currency', 
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getEquipmentSummary = () => {
    if (offer.equipment_data && Array.isArray(offer.equipment_data) && offer.equipment_data.length > 0) {
      const firstItem = offer.equipment_data[0];
      const count = offer.equipment_data.length;
      const name = firstItem.title || firstItem.name || 'Équipement';
      return count > 1 ? `${name} (+${count - 1})` : name;
    }
    if (offer.equipment_description) {
      const desc = offer.equipment_description;
      return desc.length > 40 ? `${desc.substring(0, 40)}...` : desc;
    }
    return "Non spécifié";
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          {getStatusBadge(offer.status, offer.workflow_status)}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(offer.created_at)}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-sm font-medium line-clamp-2">{getEquipmentSummary()}</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <Euro className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{formatCurrency(offer.monthly_payment)}</span>
              <span className="text-muted-foreground">/mois</span>
            </div>
            {offer.financed_amount && (
              <span className="text-muted-foreground">
                ({formatCurrency(offer.financed_amount)} financé)
              </span>
            )}
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => navigate(`/offers/${offer.id}`)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Voir la demande
        </Button>
      </CardContent>
    </Card>
  );
};

export default ClientOfferCard;
