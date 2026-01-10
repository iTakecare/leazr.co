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
import { ClientContract } from "@/hooks/useClientContracts";

interface ClientContractsTableLightProps {
  contracts: ClientContract[];
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

const ClientContractsTableLight: React.FC<ClientContractsTableLightProps> = ({ contracts }) => {
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

  const getEquipmentSummary = (contract: ClientContract) => {
    if (contract.equipment_description) {
      const desc = contract.equipment_description;
      return desc.length > 50 ? `${desc.substring(0, 50)}...` : desc;
    }
    return "Non spécifié";
  };

  if (contracts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucun contrat pour ce client
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
          <TableHead>Leaser</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell className="whitespace-nowrap">
              {formatDate(contract.created_at)}
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {getEquipmentSummary(contract)}
            </TableCell>
            <TableCell>
              {getStatusBadge(contract.status)}
            </TableCell>
            <TableCell className="text-right whitespace-nowrap">
              {formatCurrency(contract.monthly_payment)}
            </TableCell>
            <TableCell>
              {contract.leaser_name || '-'}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/contracts/${contract.id}`)}
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

export default ClientContractsTableLight;
