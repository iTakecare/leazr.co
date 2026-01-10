import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Calendar, Euro, Eye, Building2, Truck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { ClientContract } from "@/hooks/useClientContracts";

interface ClientContractCardProps {
  contract: ClientContract;
}

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    active: { label: "Actif", className: "bg-green-100 text-green-800" },
    pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800" },
    completed: { label: "Terminé", className: "bg-muted text-muted-foreground" },
    cancelled: { label: "Annulé", className: "bg-red-100 text-red-800" },
    draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
    sent: { label: "Envoyé", className: "bg-blue-100 text-blue-800" },
    request_sent: { label: "Demande envoyée", className: "bg-blue-100 text-blue-800" },
    leaser_review: { label: "En revue", className: "bg-purple-100 text-purple-800" },
    approved: { label: "Approuvé", className: "bg-emerald-100 text-emerald-800" },
    delivered: { label: "Livré", className: "bg-teal-100 text-teal-800" },
  };

  const config = statusConfig[status] || { label: status, className: "bg-muted text-muted-foreground" };
  
  return <Badge className={`${config.className} hover:${config.className}`}>{config.label}</Badge>;
};

const ClientContractCard: React.FC<ClientContractCardProps> = ({ contract }) => {
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
    if (contract.equipment_description) {
      const desc = contract.equipment_description;
      return desc.length > 40 ? `${desc.substring(0, 40)}...` : desc;
    }
    return "Non spécifié";
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          {getStatusBadge(contract.status)}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(contract.created_at)}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-sm font-medium line-clamp-2">{getEquipmentSummary()}</span>
          </div>

          <div className="flex items-center gap-1 text-sm">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{formatCurrency(contract.monthly_payment)}</span>
            <span className="text-muted-foreground">/mois</span>
          </div>

          {contract.leaser_name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span>{contract.leaser_name}</span>
            </div>
          )}

          {contract.delivery_status && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Truck className="h-4 w-4" />
              <span>{contract.delivery_status}</span>
            </div>
          )}
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => navigate(`/contracts/${contract.id}`)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Voir le contrat
        </Button>
      </CardContent>
    </Card>
  );
};

export default ClientContractCard;
