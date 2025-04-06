
import React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, User } from "lucide-react";
import { formatCurrency, formatDateToFrench } from "@/utils/formatters";

interface OffersViewProps {
  isOpen: boolean;
  onClose: () => void;
  owner: { id: string; name: string; type: "ambassador" | "partner" };
  offers: Array<{
    id: string;
    title: string;
    clientName: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
}

const OffersView = ({
  isOpen,
  onClose,
  owner,
  offers,
}: OffersViewProps) => {
  const title = owner.type === "partner" 
    ? `Offres du partenaire ${owner.name}` 
    : `Offres commercialisées par ${owner.name}`;
    
  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'signed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Signée</Badge>;
      case 'pending':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">En attente</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Refusée</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">{status}</Badge>;
    }
  };

  // Hide financial details for ambassadors
  const hideFinancialDetails = owner.type === "ambassador";

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pb-6">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Liste des offres
          </SheetDescription>
        </SheetHeader>

        {offers.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Offre</TableHead>
                <TableHead>Client</TableHead>
                {!hideFinancialDetails && <TableHead>Montant</TableHead>}
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {offers.map((offer) => (
                <TableRow key={offer.id}>
                  <TableCell>
                    <div className="font-medium">{offer.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateToFrench(new Date(offer.createdAt))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <User className="h-3 w-3 mr-1" />
                      {offer.clientName}
                    </div>
                  </TableCell>
                  {!hideFinancialDetails && (
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(offer.amount)}
                      </div>
                    </TableCell>
                  )}
                  <TableCell>
                    {getStatusBadge(offer.status)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <p className="text-muted-foreground mt-2">Aucune offre enregistrée</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default OffersView;
