
import React from "react";
import { Client } from "@/types/client";
import { 
  Table, 
  TableBody, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import ClientTableRow from "./ClientTableRow";
import ClientsEmptyState from "./ClientsEmptyState";

interface ClientListProps {
  clients: Client[];
  onDeleteClient: (id: string) => Promise<void>;
  onEditClient: (id: string) => void;
  onViewClient: (id: string) => void;
}

const ClientList = ({
  clients,
  onDeleteClient,
  onEditClient,
  onViewClient
}: ClientListProps) => {
  return (
    <div className="rounded-md border">
      <ScrollArea className="h-[calc(100vh-320px)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Société</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Date de création</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <ClientsEmptyState />
            ) : (
              clients.map((client) => (
                <ClientTableRow
                  key={client.id}
                  client={client}
                  onDelete={onDeleteClient}
                  onEdit={onEditClient}
                  onView={onViewClient}
                />
              ))
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
};

export default ClientList;
