
import React from "react";
import { Client } from "@/types/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw } from "lucide-react";

interface ExportClientsTableProps {
  clients: Client[];
  isLoading: boolean;
}

const ExportClientsTable = ({ clients, isLoading }: ExportClientsTableProps) => {
  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
        <p className="mt-2 text-sm text-gray-500">Chargement des clients...</p>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-gray-500">Aucun client trouvé.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Entreprise</TableHead>
            <TableHead>Téléphone</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell className="font-medium">{client.name}</TableCell>
              <TableCell>{client.email || "-"}</TableCell>
              <TableCell>{client.company || "-"}</TableCell>
              <TableCell>{client.phone || "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ExportClientsTable;
