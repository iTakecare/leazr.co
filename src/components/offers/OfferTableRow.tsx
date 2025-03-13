
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Mail, MoreHorizontal, X } from "lucide-react";
import OfferStatusBadge from "./OfferStatusBadge";

interface Offer {
  id: string;
  client_name: string;
  amount: number;
  monthly_payment: number;
  commission: number;
  status: string;
  created_at: string;
}

interface OfferTableRowProps {
  offer: Offer;
  onDelete: (id: string) => void;
  onResend: (id: string) => void;
  onDownload: (id: string) => void;
}

const OfferTableRow = ({ offer, onDelete, onResend, onDownload }: OfferTableRowProps) => {
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{offer.client_name}</TableCell>
      <TableCell>{formatCurrency(offer.amount)}</TableCell>
      <TableCell>{formatCurrency(offer.monthly_payment)}</TableCell>
      <TableCell>{formatCurrency(offer.commission)}</TableCell>
      <TableCell>
        <OfferStatusBadge status={offer.status} />
      </TableCell>
      <TableCell>{formatDate(offer.created_at)}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDownload(offer.id)}>
              <Download className="mr-2 h-4 w-4" />
              Télécharger
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onResend(offer.id)}>
              <Mail className="mr-2 h-4 w-4" />
              Renvoyer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(offer.id)} className="text-red-600">
              <X className="mr-2 h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default OfferTableRow;
