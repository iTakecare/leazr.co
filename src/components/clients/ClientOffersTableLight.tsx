import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { ClientOffer } from "@/hooks/useClientOffers";

interface ClientOffersTableLightProps {
  offers: ClientOffer[];
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

const ClientOffersTableLight: React.FC<ClientOffersTableLightProps> = ({ offers }) => {
  const navigate = useNavigate();

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd/MM/yyyy", { locale: fr });
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

  const getEquipmentSummary = (offer: ClientOffer) => {
    if (offer.equipment_data && Array.isArray(offer.equipment_data) && offer.equipment_data.length > 0) {
      const firstItem = offer.equipment_data[0];
      const count = offer.equipment_data.length;
      const name = firstItem.title || firstItem.name || 'Équipement';
      return count > 1 ? `${name} (+${count - 1})` : name;
    }
    if (offer.equipment_description) {
      const desc = offer.equipment_description;
      return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc;
    }
    return "Non spécifié";
  };

  if (offers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune demande pour ce client
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead className="text-right">Mensualité</TableHead>
          <TableHead className="text-right">Montant</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {offers.map((offer) => (
          <TableRow key={offer.id}>
            <TableCell className="whitespace-nowrap">
              {formatDate(offer.created_at)}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {getEquipmentSummary(offer)}
            </TableCell>
            <TableCell>
              {getStatusBadge(offer.status, offer.workflow_status)}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              {formatCurrency(offer.monthly_payment)}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              {offer.financed_amount ? formatCurrency(offer.financed_amount) : '-'}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/offers/${offer.id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default ClientOffersTableLight;
