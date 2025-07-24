
import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Eye, Trash, Calculator } from "lucide-react";
import { Client } from "@/types/client";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface ClientTableRowProps {
  client: Client;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

const ClientTableRow = ({ client, onDelete, onEdit, onView }: ClientTableRowProps) => {
  const navigate = useNavigate();
  
  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "Date incorrecte";
    
    try {
      // Convert to Date object if it's a string
      const dateObject = typeof date === 'string' ? new Date(date) : date;
      return format(dateObject, "dd/MM/yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Actif</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactif</Badge>;
      case 'lead':
        return <Badge variant="outline">Prospect</Badge>;
      default:
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Actif</Badge>;
    }
  };

  const handleViewClient = () => {
    navigate(`/clients/${client.id}`);
  };

  return (
    <TableRow>
      <TableCell className="font-medium">{client.name}</TableCell>
      <TableCell>{client.company || "-"}</TableCell>
      <TableCell>{client.email || "-"}</TableCell>
      <TableCell>{client.phone || "-"}</TableCell>
      <TableCell>{getStatusBadge(client.status)}</TableCell>
      <TableCell>{formatDate(client.created_at)}</TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleViewClient}>
              <Eye className="mr-2 h-4 w-4" />
              Voir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(client.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate(`/admin/create-offer?client=${client.id}`)}>
              <Calculator className="mr-2 h-4 w-4" />
              Créer une offre
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(client.id)} className="text-red-600">
              <Trash className="mr-2 h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export default ClientTableRow;
