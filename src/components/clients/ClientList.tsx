
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
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  
  // Count clients by status
  const activeClients = clients.filter(client => client.status === 'active').length;
  const inactiveClients = clients.filter(client => client.status === 'inactive').length;
  const leadClients = clients.filter(client => client.status === 'lead').length;

  return (
    <div className="rounded-md border">
      {clients.length > 0 && (
        <div className="flex items-center justify-between p-2 border-b">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-green-500 hover:bg-green-600">
              {activeClients} actifs
            </Badge>
            <Badge variant="secondary">
              {inactiveClients} inactifs
            </Badge>
            <Badge variant="outline">
              {leadClients} prospects
            </Badge>
          </div>
          
          <Button 
            onClick={() => navigate('/clients/create')} 
            variant="outline" 
            size="sm" 
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Nouveau client
          </Button>
        </div>
      )}
      <ScrollArea className="h-[calc(100vh-320px)]">
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
