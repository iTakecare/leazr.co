
import React, { useState } from "react";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import { 
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileText, Package, CheckCircle, Truck, Play, AlarmClock } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Contract, contractStatuses } from "@/services/contractService";
import ContractStatusBadge from "@/components/contracts/ContractStatusBadge";
import { Badge } from "@/components/ui/badge";

interface ContractsTableProps {
  contracts: Contract[];
  onStatusChange: (contractId: string, newStatus: string, reason?: string) => Promise<void>;
  onAddTrackingInfo: (contractId: string, trackingNumber: string, estimatedDelivery?: string, carrier?: string) => Promise<void>;
  isUpdatingStatus: boolean;
}

const ContractsTable: React.FC<ContractsTableProps> = ({
  contracts,
  onStatusChange,
  onAddTrackingInfo,
  isUpdatingStatus
}) => {
  const navigate = useNavigate();
  
  const getAvailableActions = (contract: Contract) => {
    const actions = [];
    
    actions.push({
      label: "Voir détails",
      icon: FileText,
      onClick: () => navigate(`/contracts/${contract.id}`),
    });
    
    return actions;
  };

  if (contracts.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center">
        <p className="text-muted-foreground mb-4">Aucun contrat trouvé</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Référence</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Mensualité</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {contracts.map((contract) => {
            const availableActions = getAvailableActions(contract);
            
            return (
              <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell 
                  className="font-medium"
                  onClick={() => navigate(`/contracts/${contract.id}`)}
                >
                  {`CON-${contract.id.slice(0, 8)}`}
                  {contract.tracking_number && (
                    <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                      Suivi
                    </Badge>
                  )}
                </TableCell>
                <TableCell onClick={() => navigate(`/contracts/${contract.id}`)}>{contract.client_name}</TableCell>
                <TableCell onClick={() => navigate(`/contracts/${contract.id}`)}>{formatCurrency(contract.monthly_payment || 0)}</TableCell>
                <TableCell onClick={() => navigate(`/contracts/${contract.id}`)}>{formatDate(contract.created_at)}</TableCell>
                <TableCell onClick={() => navigate(`/contracts/${contract.id}`)}>
                  <ContractStatusBadge status={contract.status} />
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {availableActions.map((action, index) => (
                        <React.Fragment key={action.label}>
                          {index > 0 && index === availableActions.length - 1 && <DropdownMenuSeparator />}
                          <DropdownMenuItem 
                            onClick={action.onClick}
                            disabled={isUpdatingStatus}
                          >
                            <action.icon className="w-4 h-4 mr-2" />
                            {action.label}
                          </DropdownMenuItem>
                        </React.Fragment>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default ContractsTable;
