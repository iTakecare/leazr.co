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
import { FileText, Mail, Phone, User } from "lucide-react";
import { formatDateToFrench } from "@/utils/formatters";

interface ClientsViewProps {
  isOpen: boolean;
  onClose: () => void;
  client: {
    id: string;
    name: string;
    email: string;
    phone: string;
    createdAt: string;
    offers: Array<{
      id: string;
      title: string;
      amount: number;
      status: string;
    }>;
  };
}

const ClientsView = ({
  isOpen,
  onClose,
  client,
}: ClientsViewProps) => {
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader className="pb-6">
          <SheetTitle>Informations du client</SheetTitle>
          <SheetDescription>
            Détails du client et historique des offres
          </SheetDescription>
        </SheetHeader>

        <div className="grid gap-4">
          <div className="border rounded-md p-4">
            <h4 className="text-sm font-medium">Informations personnelles</h4>
            <div className="grid gap-2 mt-2">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{client.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${client.email}`} className="hover:underline">
                  {client.email}
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{client.phone}</span>
              </div>
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span>Client depuis le {formatDateToFrench(client.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="border rounded-md p-4">
            <h4 className="text-sm font-medium">Historique des offres</h4>
            {client.offers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Offre</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {client.offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell>
                        <div className="font-medium">{offer.title}</div>
                        <div className="text-xs text-muted-foreground">
                          Créée le {formatDateToFrench(new Date())}
                        </div>
                      </TableCell>
                      <TableCell>{offer.amount}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{offer.status}</Badge>
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ClientsView;
