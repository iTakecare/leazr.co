
import React from "react";
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import OfferTableRow from "./OfferTableRow";
import OffersEmptyState from "./OffersEmptyState";
import OfferDetailCard from "./OfferDetailCard";

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
  workflow_status?: string;
  created_at: string;
}

interface OffersTableProps {
  offers: Offer[];
  onDeleteOffer: (id: string) => Promise<void>;
  onResendOffer: (id: string) => void;
  onDownloadPdf: (id: string) => void;
  onStatusChange?: (id: string, status: string, reason?: string) => Promise<void>;
  isUpdatingStatus?: boolean;
}

const OffersTable = ({
  offers,
  onDeleteOffer,
  onResendOffer,
  onDownloadPdf,
  onStatusChange,
  isUpdatingStatus = false
}: OffersTableProps) => {
  // Vérifier si offers est null ou vide
  if (!offers || offers.length === 0) {
    return (
      <div className="rounded-md border">
        <ScrollArea className="h-[calc(100vh-320px)]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Loyer mensuel</TableHead>
                <TableHead>Commission</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <OffersEmptyState />
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
    );
  }

  // Utiliser le mode carte détaillée avec le workflow
  return (
    <div className="space-y-4">
      {offers.map((offer) => (
        <OfferDetailCard
          key={offer.id}
          offer={offer}
          onStatusChange={onStatusChange ? (status, reason) => onStatusChange(offer.id, status, reason) : undefined}
          isUpdatingStatus={isUpdatingStatus}
          onDelete={() => onDeleteOffer(offer.id)}
        />
      ))}
    </div>
  );
};

export default OffersTable;
