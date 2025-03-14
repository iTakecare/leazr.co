
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
import { Download, Mail, MoreHorizontal, Trash2, User, Eye } from "lucide-react";
import OfferStatusBadge from "./OfferStatusBadge";
import { useNavigate } from "react-router-dom";

interface Offer {
  id: string;
  client_name: string;
  client_id?: string;
  clients?: {
    name: string;
    email: string;
    company: string;
  } | null;
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
  const navigate = useNavigate();
  
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  const displayClientInfo = () => {
    if (offer.clients) {
      return (
        <div>
          <div className="font-medium">{offer.clients.name}</div>
          {offer.clients.company && (
            <div className="text-xs text-muted-foreground">{offer.clients.company}</div>
          )}
        </div>
      );
    }
    
    return <div className="font-medium">{offer.client_name}</div>;
  };

  return (
    <TableRow>
      <TableCell>
        {displayClientInfo()}
      </TableCell>
      <TableCell>{formatCurrency(offer.amount)}</TableCell>
      <TableCell>{formatCurrency(offer.monthly_payment)}</TableCell>
      <TableCell>{formatCurrency(offer.commission)}</TableCell>
      <TableCell>
        <OfferStatusBadge status={offer.status} />
      </TableCell>
      <TableCell>{formatDate(offer.created_at)}</TableCell>
      <TableCell className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 p-0 text-red-500 hover:bg-red-100 hover:text-red-700"
          onClick={() => onDelete(offer.id)}
          title="Supprimer l'offre"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
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
            {offer.client_id && (
              <DropdownMenuItem onClick={() => navigate(`/clients/${offer.client_id}`)}>
                <User className="mr-2 h-4 w-4" />
                Voir le client
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default OfferTableRow;
