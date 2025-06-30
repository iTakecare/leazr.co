
import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Eye, FileText, Trash2 } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Contract } from "@/services/contractService";
import ContractStatusBadge from "./ContractStatusBadge";

interface ContractsTableProps {
  contracts: Contract[];
  onRefresh: () => void;
}

const ContractsTable: React.FC<ContractsTableProps> = ({ contracts, onRefresh }) => {
  const navigate = useNavigate();

  const handleViewDetails = (contractId: string) => {
    console.log("🔍 Navigation vers les détails du contrat:", contractId);
    navigate(`/admin/contracts/${contractId}`);
  };

  const handleMarkAsSigned = (contract: Contract) => {
    // Logique pour marquer comme signé
    console.log("Marquer comme signé:", contract.id);
  };

  const handleDelete = (contract: Contract) => {
    // Logique de suppression
    console.log("Supprimer le contrat:", contract.id);
  };

  if (contracts.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        Aucun contrat trouvé
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Matériel</TableHead>
            <TableHead>Bailleur</TableHead>
            <TableHead>Mensualité</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Suivi</TableHead>
            <TableHead className="w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => (
            <TableRow key={contract.id}>
              <TableCell>{formatDate(contract.created_at)}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{contract.client_name}</div>
                  {contract.clients?.email && (
                    <div className="text-sm text-gray-500">{contract.clients.email}</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="max-w-[200px] truncate">
                  {contract.equipment_description || "Non spécifié"}
                </div>
              </TableCell>
              <TableCell>{contract.leaser_name}</TableCell>
              <TableCell>{formatCurrency(contract.monthly_payment)}</TableCell>
              <TableCell>
                <ContractStatusBadge status={contract.status} />
              </TableCell>
              <TableCell>
                {contract.tracking_number ? (
                  <div className="text-sm">
                    <div className="font-medium">{contract.tracking_number}</div>
                    {contract.delivery_carrier && (
                      <div className="text-gray-500">{contract.delivery_carrier}</div>
                    )}
                  </div>
                ) : (
                  <span className="text-gray-400">Non suivi</span>
                )}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleViewDetails(contract.id)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMarkAsSigned(contract)}>
                      <FileText className="mr-2 h-4 w-4" />
                      Marquer comme signé
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleDelete(contract)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ContractsTable;
