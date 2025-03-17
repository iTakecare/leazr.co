
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
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();
  
  // Count clients by status
  const activeClients = clients.filter(client => client.status === 'active').length;
  const inactiveClients = clients.filter(client => client.status === 'inactive').length;
  const leadClients = clients.filter(client => client.status === 'lead').length;

  return (
    <div className="rounded-md border">
      {clients.length > 0 && (
        <div className="flex items-center justify-between p-2 border-b overflow-x-auto">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500 hover:bg-green-600 whitespace-nowrap">
              {activeClients} actifs
            </Badge>
            <Badge variant="secondary" className="whitespace-nowrap">
              {inactiveClients} inactifs
            </Badge>
            <Badge variant="outline" className="whitespace-nowrap">
              {leadClients} prospects
            </Badge>
          </div>
        </div>
      )}
      <ScrollArea className={`h-[calc(100vh-${isMobile ? '340px' : '320px'})]`}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Société</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Statut</TableHead>
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
