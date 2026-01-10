import React from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { FileText, ScrollText, ExternalLink, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useRoleNavigation } from "@/hooks/useRoleNavigation";

interface ClientOffer {
  id: string;
  client_name: string;
  amount?: number;
  monthly_payment?: number;
  status?: string;
  workflow_status?: string;
  created_at: string;
  type?: string;
  is_purchase?: boolean;
  dossier_number?: string;
}

interface ClientContract {
  id: string;
  client_name: string;
  monthly_payment?: number;
  status?: string;
  created_at: string;
  leaser_name?: string;
  contract_number?: string;
}

interface ClientOtherDealsListProps {
  offers: ClientOffer[];
  contracts: ClientContract[];
  compact?: boolean;
}

const getOfferStatusBadge = (status?: string, workflowStatus?: string) => {
  const displayStatus = workflowStatus || status || "draft";
  const statusLabels: Record<string, string> = {
    draft: "Brouillon",
    pending: "En attente",
    sent: "Envoyée",
    approved: "Approuvée",
    rejected: "Refusée",
    info_requested: "Info demandée",
    leaser_pending: "Bailleur en attente",
    leaser_review: "Revue bailleur",
  };
  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    pending: "bg-yellow-100 text-yellow-800",
    sent: "bg-blue-100 text-blue-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    info_requested: "bg-orange-100 text-orange-800",
    leaser_pending: "bg-purple-100 text-purple-800",
    leaser_review: "bg-indigo-100 text-indigo-800",
  };
  return (
    <Badge className={`${statusColors[displayStatus] || statusColors.draft} text-xs`}>
      {statusLabels[displayStatus] || displayStatus}
    </Badge>
  );
};

const getContractStatusBadge = (status?: string) => {
  const displayStatus = status || "active";
  const statusLabels: Record<string, string> = {
    active: "Actif",
    pending: "En attente",
    completed: "Terminé",
    cancelled: "Annulé",
  };
  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-gray-100 text-gray-800",
    cancelled: "bg-red-100 text-red-800",
  };
  return (
    <Badge className={`${statusColors[displayStatus] || statusColors.active} text-xs`}>
      {statusLabels[displayStatus] || displayStatus}
    </Badge>
  );
};

const formatDate = (date: string) => {
  try {
    return format(new Date(date), "dd/MM/yyyy", { locale: fr });
  } catch {
    return "-";
  }
};

const formatCurrency = (amount?: number) => {
  if (!amount) return "-";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

const ClientOtherDealsList: React.FC<ClientOtherDealsListProps> = ({
  offers,
  contracts,
  compact = false,
}) => {
  const { companySlug } = useRoleNavigation();

  // Séparer les ventes directes des demandes normales
  const directSales = offers.filter(o => o.type === 'purchase_request');
  const regularOffers = offers.filter(o => o.type !== 'purchase_request');

  if (offers.length === 0 && contracts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Aucun autre dossier pour ce client
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {/* Ventes directes */}
      {directSales.length > 0 && (
        <div className="space-y-2">
          {!compact && (
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" />
              Ventes directes ({directSales.length})
            </h4>
          )}
          <div className="space-y-1">
            {directSales.map((sale) => (
              <Link
                key={sale.id}
                to={`/${companySlug}/admin/offers/${sale.id}`}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ShoppingCart className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium font-mono">
                    {sale.dossier_number || formatDate(sale.created_at)}
                  </span>
                  {getOfferStatusBadge(sale.status, sale.workflow_status)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-green-600">
                    {formatCurrency(sale.amount)}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Demandes (offres normales) */}
      {regularOffers.length > 0 && (
        <div className="space-y-2">
          {!compact && (
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Demandes ({regularOffers.length})
            </h4>
          )}
          <div className="space-y-1">
            {regularOffers.map((offer) => (
              <Link
                key={offer.id}
                to={`/${companySlug}/admin/offers/${offer.id}`}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {formatDate(offer.created_at)}
                  </span>
                  {getOfferStatusBadge(offer.status, offer.workflow_status)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(offer.monthly_payment)}/mois
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Contracts */}
      {contracts.length > 0 && (
        <div className="space-y-2">
          {!compact && (
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
              <ScrollText className="w-3 h-3" />
              Contrats ({contracts.length})
            </h4>
          )}
          <div className="space-y-1">
            {contracts.map((contract) => (
              <Link
                key={contract.id}
                to={`/${companySlug}/admin/contracts/${contract.id}`}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <ScrollText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate font-mono">
                    {contract.contract_number || `CON-${contract.id.slice(0, 8)}`}
                  </span>
                  {getContractStatusBadge(contract.status)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(contract.monthly_payment)}/mois
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientOtherDealsList;
