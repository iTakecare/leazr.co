
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
import { User, Building2 } from "lucide-react";
import { formatDateToFrench } from "@/utils/formatters";

interface ClientsViewProps {
  isOpen: boolean;
  onClose: () => void;
  owner: { id: string; name: string; type: "ambassador" | "partner" };
  clients: Array<{
    id: string;
    name: string;
    company?: string;
    status: string;
    createdAt: string;
  }>;
}

const ClientsView = ({
  isOpen,
  onClose,
  owner,
  clients,
}: ClientsViewProps) => {
  const title = owner.type === "ambassador" 
    ? `Clients de ${owner.name}` 
    : `Clients du partenaire ${owner.name}`;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader className="pb-6">
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>
            Liste des clients attribués
          </SheetDescription>
        </SheetHeader>

        {clients.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="font-medium">{client.name}</div>
                    {client.company && (
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3 mr-1" />
                        {client.company}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.status === 'active' ? 'default' : 'secondary'} className={
                      client.status === 'active' 
                        ? "bg-green-100 text-green-800 hover:bg-green-100" 
                        : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                    }>
                      {client.status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDateToFrench(new Date(client.createdAt))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Aucun client n'est attribué</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ClientsView;
