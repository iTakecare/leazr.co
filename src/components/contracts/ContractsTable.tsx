
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
import { MoreHorizontal, FileText, Package, CheckCircle, Truck, Play, AlarmClock, Trash } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Contract, contractStatuses } from "@/services/contractService";
import ContractStatusBadge from "@/components/contracts/ContractStatusBadge";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ContractsTableProps {
  contracts: Contract[];
  onStatusChange: (contractId: string, newStatus: string, reason?: string) => Promise<void>;
  onAddTrackingInfo: (contractId: string, trackingNumber: string, estimatedDelivery?: string, carrier?: string) => Promise<void>;
  onDeleteContract?: (contractId: string) => Promise<boolean>;
  isUpdatingStatus: boolean;
  isDeleting?: boolean;
}

const ContractsTable: React.FC<ContractsTableProps> = ({
  contracts,
  onStatusChange,
  onAddTrackingInfo,
  onDeleteContract,
  isUpdatingStatus,
  isDeleting = false
}) => {
  const navigate = useNavigate();
  const [contractToDelete, setContractToDelete] = useState<string | null>(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const getAvailableActions = (contract: Contract) => {
    const actions = [];
    
    actions.push({
      label: "Voir détails",
      icon: FileText,
      onClick: () => navigate(`/contracts/${contract.id}`),
    });
    
    if (onDeleteContract) {
      actions.push({
        label: "Supprimer",
        icon: Trash,
        onClick: () => {
          console.log("Demande de suppression pour:", contract.id);
          setContractToDelete(contract.id);
          setIsDialogOpen(true);
        },
        danger: true
      });
    }
    
    return actions;
  };

  const handleDeleteConfirm = async () => {
    if (!contractToDelete || !onDeleteContract) return;
    
    console.log("Confirmation de suppression pour:", contractToDelete);
    setDeleteInProgress(true);
    
    try {
      const deleted = await onDeleteContract(contractToDelete);
      console.log("Résultat de la suppression:", deleted ? "Succès" : "Échec");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    } finally {
      setIsDialogOpen(false);
      setContractToDelete(null);
      setDeleteInProgress(false);
    }
  };

  const handleCancelDelete = () => {
    setIsDialogOpen(false);
    setContractToDelete(null);
  };

  if (contracts.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center">
        <p className="text-muted-foreground mb-4">Aucun contrat trouvé</p>
      </div>
    );
  }

  return (
    <>
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
                        <Button variant="ghost" size="icon" disabled={isDeleting || deleteInProgress}>
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {availableActions.map((action, index) => (
                          <DropdownMenuItem 
                            key={action.label}
                            onClick={action.onClick}
                            disabled={isUpdatingStatus || isDeleting || deleteInProgress}
                            className={action.danger ? "text-destructive focus:text-destructive" : ""}
                          >
                            <action.icon className="w-4 h-4 mr-2" />
                            {action.label}
                          </DropdownMenuItem>
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

      {/* Confirmation Dialog */}
      <AlertDialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open && !deleteInProgress) {
            handleCancelDelete();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le contrat sera définitivement supprimé de la base de données.
              L'offre associée à ce contrat sera marquée comme non convertie.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteInProgress || isDeleting}
              onClick={handleCancelDelete}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteInProgress || isDeleting}
            >
              {deleteInProgress || isDeleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ContractsTable;
