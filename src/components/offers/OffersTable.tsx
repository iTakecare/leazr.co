
import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Offer } from "@/hooks/offers/useFetchOffers";
import { formatCurrency } from "@/utils/formatters";
import { 
  Pencil, Trash2, MoreHorizontal, File, FilePlus, Send
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import OfferStatusBadge from "./OfferStatusBadge";
import OffersEmptyState from "./OffersEmptyState";
import { formatEquipmentDisplay } from "@/utils/equipmentFormatter";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface OffersTableProps {
  offers: Offer[];
  onStatusChange: (offerId: string, newStatus: string) => Promise<void>;
  onDeleteOffer: (offerId: string) => Promise<void>;
  onResendOffer?: (offerId: string) => Promise<void>;
  onDownloadPdf?: (offerId: string) => Promise<void>;
  isUpdatingStatus: boolean;
}

const OffersTable: React.FC<OffersTableProps> = ({ 
  offers,
  onStatusChange,
  onDeleteOffer,
  onResendOffer,
  onDownloadPdf,
  isUpdatingStatus
}) => {
  if (offers.length === 0) {
    return <OffersEmptyState />;
  }

  // Calcule le montant total correct à partir des données d'équipement
  const getTotalAmount = (offer: Offer) => {
    try {
      if (offer.equipment_description) {
        let equipmentList;
        
        if (typeof offer.equipment_description === 'string') {
          try {
            equipmentList = JSON.parse(offer.equipment_description);
          } catch (e) {
            console.error("Erreur parsing equipment_description:", e);
            return offer.amount;
          }
        } else if (typeof offer.equipment_description === 'object') {
          equipmentList = offer.equipment_description;
        }
        
        if (Array.isArray(equipmentList) && equipmentList.length > 0) {
          return equipmentList.reduce((total, item) => {
            const priceWithMargin = item.purchasePrice * (1 + (item.margin / 100));
            return total + (priceWithMargin * (item.quantity || 1));
          }, 0);
        }
      }
    } catch (e) {
      console.error("Erreur lors du calcul du montant total:", e);
    }
    
    return offer.amount;
  };

  // Formatage de l'affichage de l'équipement pour la table
  const formatEquipment = (offer: Offer) => {
    try {
      return formatEquipmentDisplay(offer.equipment_description);
    } catch (e) {
      console.error("Erreur lors du formatage de l'équipement:", e);
      return "Équipement non détaillé";
    }
  };
  
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Équipement</TableHead>
            <TableHead className="text-right">Montant</TableHead>
            <TableHead className="text-right">Mensualité</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {offers.map((offer) => (
            <TableRow key={offer.id}>
              <TableCell className="font-medium">
                {format(new Date(offer.created_at), "dd MMM yyyy", { locale: fr })}
              </TableCell>
              <TableCell>{offer.client_name}</TableCell>
              <TableCell className="max-w-[240px] truncate">
                {formatEquipment(offer)}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(getTotalAmount(offer))}
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(offer.monthly_payment)}
              </TableCell>
              <TableCell>
                <OfferStatusBadge status={offer.workflow_status} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => window.location.href = `/create-offer?id=${offer.id}`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Éditer
                    </DropdownMenuItem>
                    {onDownloadPdf && (
                      <DropdownMenuItem onClick={() => onDownloadPdf(offer.id)}>
                        <File className="mr-2 h-4 w-4" />
                        Télécharger PDF
                      </DropdownMenuItem>
                    )}
                    {onResendOffer && (
                      <DropdownMenuItem onClick={() => onResendOffer(offer.id)}>
                        <Send className="mr-2 h-4 w-4" />
                        Renvoyer l'offre
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      onClick={() => window.location.href = `/offer/${offer.id}`}
                      disabled={isUpdatingStatus}
                    >
                      <FilePlus className="mr-2 h-4 w-4" />
                      Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onDeleteOffer(offer.id)}
                      className="text-red-600 focus:text-red-700"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default OffersTable;
