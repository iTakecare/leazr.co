import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { ClientOffer } from "@/hooks/useClientOffers";

interface ClientDirectSalesTableLightProps {
  sales: ClientOffer[];
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

const ClientDirectSalesTableLight: React.FC<ClientDirectSalesTableLightProps> = ({ sales }) => {
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
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const getEquipmentSummary = (sale: ClientOffer) => {
    if (sale.equipment_data && Array.isArray(sale.equipment_data) && sale.equipment_data.length > 0) {
      const firstItem = sale.equipment_data[0];
      const count = sale.equipment_data.length;
      const name = firstItem.title || firstItem.name || 'Équipement';
      return count > 1 ? `${name} (+${count - 1})` : name;
    }
    if (sale.equipment_description) {
      const desc = sale.equipment_description;
      return desc.length > 30 ? `${desc.substring(0, 30)}...` : desc;
    }
    return "Non spécifié";
  };

  if (sales.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Aucune vente directe pour ce client
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Date</TableHead>
            <TableHead className="w-[150px]">N° Dossier</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-[100px]">Statut</TableHead>
            <TableHead className="w-[120px] text-right">Montant</TableHead>
            <TableHead className="w-[80px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale) => (
            <TableRow key={sale.id}>
              <TableCell className="text-sm">{formatDate(sale.created_at)}</TableCell>
              <TableCell className="font-mono text-sm">{sale.dossier_number || "-"}</TableCell>
              <TableCell className="text-sm truncate max-w-[200px]">{getEquipmentSummary(sale)}</TableCell>
              <TableCell>{getStatusBadge(sale.status, sale.workflow_status)}</TableCell>
              <TableCell className="text-right font-medium text-green-600">{formatCurrency(sale.amount)}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/offers/${sale.id}`)}
                  title="Voir la vente"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ClientDirectSalesTableLight;
