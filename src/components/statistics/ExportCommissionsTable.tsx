
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
import { RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { AmbassadorCommission } from "@/services/ambassadorCommissionService";

interface ExportCommissionsTableProps {
  commissions: AmbassadorCommission[];
  isLoading: boolean;
}

const ExportCommissionsTable = ({ commissions, isLoading }: ExportCommissionsTableProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Payée
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            En attente
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 flex items-center gap-1">
            <XCircle className="h-3 w-3" />
            Annulée
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">Chargement des commissions...</p>
      </div>
    );
  }

  if (commissions.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Aucune commission trouvée.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.map((commission) => (
            <TableRow key={commission.id}>
              <TableCell className="whitespace-nowrap">
                {format(new Date(commission.date), 'dd MMM yyyy', { locale: fr })}
              </TableCell>
              <TableCell className="max-w-[150px] truncate">
                {commission.clientName}
              </TableCell>
              <TableCell className="max-w-[200px] truncate">
                {commission.description || "—"}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(commission.amount)}
              </TableCell>
              <TableCell>
                {getStatusBadge(commission.status)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ExportCommissionsTable;
