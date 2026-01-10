import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Calendar, Euro, Eye, FileCheck } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { ClientOffer } from "@/hooks/useClientOffers";

interface ClientDirectSaleCardProps {
  sale: ClientOffer;
}

const getStatusBadge = (status: string, workflowStatus?: string) => {
  const displayStatus = workflowStatus || status;
  
  const statusConfig: Record<string, { label: string; className: string }> = {
    draft: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
    pending: { label: "En attente", className: "bg-yellow-100 text-yellow-800" },
    sent: { label: "Envoyée", className: "bg-blue-100 text-blue-800" },
    approved: { label: "Acceptée", className: "bg-green-100 text-green-800" },
    invoicing: { label: "Facturée", className: "bg-emerald-100 text-emerald-800" },
    invoiced: { label: "Facturée", className: "bg-emerald-100 text-emerald-800" },
    completed: { label: "Complétée", className: "bg-green-100 text-green-800" },
  };

  const config = statusConfig[displayStatus] || { label: displayStatus, className: "bg-muted text-muted-foreground" };
  
  return <Badge className={`${config.className} hover:${config.className}`}>{config.label}</Badge>;
};

const ClientDirectSaleCard: React.FC<ClientDirectSaleCardProps> = ({ sale }) => {
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getEquipmentSummary = () => {
    if (sale.equipment_data && Array.isArray(sale.equipment_data) && sale.equipment_data.length > 0) {
      const firstItem = sale.equipment_data[0];
      const count = sale.equipment_data.length;
      const name = firstItem.title || firstItem.name || 'Équipement';
      return count > 1 ? `${name} (+${count - 1})` : name;
    }
    if (sale.equipment_description) {
      const desc = sale.equipment_description;
      return desc.length > 40 ? `${desc.substring(0, 40)}...` : desc;
    }
    return "Non spécifié";
  };

  return (
    <Card className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          {getStatusBadge(sale.status, sale.workflow_status)}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(sale.created_at)}
          </span>
        </div>

        <div className="space-y-2 mb-4">
          {sale.dossier_number && (
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-mono font-medium">{sale.dossier_number}</span>
            </div>
          )}

          <div className="flex items-start gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <span className="text-sm line-clamp-2">{getEquipmentSummary()}</span>
          </div>

          <div className="flex items-center gap-1">
            <Euro className="h-4 w-4 text-green-600" />
            <span className="font-semibold text-green-600">{formatCurrency(sale.amount)}</span>
          </div>
        </div>

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => navigate(`/offers/${sale.id}`)}
        >
          <Eye className="h-4 w-4 mr-2" />
          Voir la vente
        </Button>
      </CardContent>
    </Card>
  );
};

export default ClientDirectSaleCard;
