
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

interface Offer {
  id: string;
  client_name: string;
  amount: number;
  monthly_payment: number;
  commission: number;
  status: string;
  workflow_status?: string;
  created_at: string;
  clients?: {
    name: string;
    email: string;
    company: string;
  } | null;
}

interface OffersTableProps {
  offers: Offer[];
  onDeleteOffer: (id: string) => Promise<void>;
  onResendOffer: (id: string) => void;
  onDownloadPdf: (id: string) => void;
}

const OffersTable = ({
  offers,
  onDeleteOffer,
  onResendOffer,
  onDownloadPdf
}: OffersTableProps) => {
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
            {offers.map((offer) => (
              <OfferTableRow
                key={offer.id}
                offer={offer}
                onDelete={onDeleteOffer}
                onResend={onResendOffer}
                onDownload={onDownloadPdf}
              />
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default OffersTable;
