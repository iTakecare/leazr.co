
import React, { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Contract } from "@/services/contractService";
import { formatCurrency, formatDate } from "@/utils/formatters";
import { MoreHorizontal, Trash2, ExternalLink, Package, Eye, Box, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ContractStatusBadge from "./ContractStatusBadge";

interface ContractsTableProps {
  contracts: Contract[];
  onStatusChange: (contractId: string, newStatus: string) => Promise<void>;
  onAddTrackingInfo: (contractId: string, trackingNumber: string, estimatedDelivery?: string, carrier?: string) => Promise<void>;
  onDeleteContract: (contractId: string) => Promise<void>;
  isUpdatingStatus: boolean;
  isDeleting: boolean;
  deleteInProgress?: string | null;
}

const ContractsTable: React.FC<ContractsTableProps> = ({
  contracts,
  onStatusChange,
  onAddTrackingInfo,
  onDeleteContract,
  isUpdatingStatus,
  isDeleting,
  deleteInProgress
}) => {
  const navigate = useNavigate();
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<any[]>([]);
  const [equipmentModalTitle, setEquipmentModalTitle] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  
  const handleRowClick = (contractId: string) => {
    navigate(`/contracts/${contractId}`);
  };
  
  const formatDateString = (dateString?: string) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch (e) {
      return dateString;
    }
  };

  const handleDelete = async (contractId: string) => {
    try {
      // Close confirm dialog immediately for better UX
      setConfirmDelete(null);
      
      // Ensure we can't trigger multiple deletions
      if (isDeleting || deleteInProgress) {
        console.log("DELETE UI: Ignoring delete request, deletion already in progress");
        return;
      }
      
      console.log("DELETE UI: Initiating deletion for contract:", contractId);
      await onDeleteContract(contractId);
    } catch (error) {
      console.error("DELETE UI ERROR: Error in handleDelete:", error);
      setConfirmDelete(null);
    }
  };

  const openEquipmentModal = (equipment: string | undefined, contractName: string) => {
    if (!equipment) {
      return;
    }
    
    try {
      let parsedEquipment: any[] = [];
      if (typeof equipment === 'string') {
        parsedEquipment = JSON.parse(equipment);
      } else {
        parsedEquipment = equipment as any;
      }
      
      if (!Array.isArray(parsedEquipment)) {
        parsedEquipment = [parsedEquipment];
      }
      
      setSelectedEquipment(parsedEquipment);
      setEquipmentModalTitle(`Équipement : ${contractName}`);
      setEquipmentModalOpen(true);
    } catch (e) {
      console.error("Erreur lors de l'analyse des données d'équipement:", e);
      setSelectedEquipment([{ title: equipment }]);
      setEquipmentModalTitle(`Équipement : ${contractName}`);
      setEquipmentModalOpen(true);
    }
  };

  const getEquipmentSummary = (equipment: string | undefined): string => {
    if (!equipment) return "Non spécifié";
    
    try {
      let parsedEquipment: any[] = [];
      if (typeof equipment === 'string') {
        parsedEquipment = JSON.parse(equipment);
      } else {
        parsedEquipment = equipment as any;
      }
      
      if (!Array.isArray(parsedEquipment)) {
        parsedEquipment = [parsedEquipment];
      }
      
      if (parsedEquipment.length === 0) return "Non spécifié";
      
      if (parsedEquipment.length === 1) {
        return parsedEquipment[0].title || "1 item";
      } else {
        return `${parsedEquipment.length} items`;
      }
    } catch (e) {
      return equipment.length > 30 ? `${equipment.substring(0, 30)}...` : equipment;
    }
  };

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrat</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Matériel</TableHead>
              <TableHead>Bailleur</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow 
                key={contract.id} 
                className={
                  deleteInProgress === contract.id 
                    ? "opacity-40 pointer-events-none bg-red-50 transition-all" 
                    : isDeleting 
                      ? "opacity-70 pointer-events-none transition-all"
                      : "transition-all"
                }
              >
                <TableCell className="font-medium cursor-pointer" onClick={() => handleRowClick(contract.id)}>
                  {contract.id ? `CON-${contract.id.slice(0, 8)}` : 'N/A'}
                </TableCell>
                <TableCell onClick={() => handleRowClick(contract.id)} className="cursor-pointer">
                  {contract.client_name}
                  {contract.clients?.company && (
                    <div className="text-xs text-muted-foreground">{contract.clients.company}</div>
                  )}
                </TableCell>
                <TableCell onClick={() => handleRowClick(contract.id)} className="cursor-pointer">
                  {formatDateString(contract.created_at)}
                </TableCell>
                <TableCell>
                  <ContractStatusBadge status={contract.status} />
                </TableCell>
                <TableCell onClick={() => handleRowClick(contract.id)} className="cursor-pointer">
                  {formatCurrency(contract.monthly_payment)}<span className="text-xs text-muted-foreground">/mois</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className="truncate max-w-[150px]">{getEquipmentSummary(contract.equipment_description)}</span>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEquipmentModal(contract.equipment_description, contract.client_name);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell onClick={() => handleRowClick(contract.id)} className="cursor-pointer">
                  <div className="flex items-center space-x-2">
                    {contract.leaser_logo && (
                      <img 
                        src={contract.leaser_logo} 
                        alt={contract.leaser_name} 
                        className="h-5 w-5 object-contain" 
                      />
                    )}
                    <span>{contract.leaser_name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        disabled={deleteInProgress !== null || isDeleting}
                      >
                        {deleteInProgress === contract.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <MoreHorizontal className="h-4 w-4" />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => handleRowClick(contract.id)}
                        disabled={isDeleting || deleteInProgress !== null}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        <span>Voir les détails</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (deleteInProgress !== null || isDeleting) return;
                          setConfirmDelete(contract.id);
                        }}
                        disabled={isDeleting || deleteInProgress !== null}
                        className="text-red-500 focus:text-red-500"
                      >
                        {deleteInProgress === contract.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span>Suppression...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Supprimer</span>
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}

            {contracts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Aucun contrat trouvé.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog 
        open={!!confirmDelete} 
        onOpenChange={(open) => {
          // Don't allow closing the dialog if deletion is in progress
          if (!open && !isDeleting && deleteInProgress === null) {
            setConfirmDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Cela supprimera définitivement ce contrat.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting || deleteInProgress !== null}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete && !isDeleting && deleteInProgress === null) {
                  handleDelete(confirmDelete);
                }
              }}
              className="bg-red-500 hover:bg-red-600"
              disabled={isDeleting || deleteInProgress !== null}
            >
              {isDeleting || deleteInProgress !== null ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={equipmentModalOpen} onOpenChange={setEquipmentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{equipmentModalTitle}</DialogTitle>
            <DialogDescription>
              Détails des équipements associés à ce contrat
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {selectedEquipment && selectedEquipment.length > 0 ? (
              selectedEquipment.map((item, index) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Box className="h-4 w-4 text-primary" />
                    <h3 className="font-medium">{item.title}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {item.purchasePrice !== undefined && (
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Prix d'achat</span>
                        <span>{formatCurrency(item.purchasePrice)}</span>
                      </div>
                    )}
                    
                    {item.quantity !== undefined && (
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Quantité</span>
                        <span>{item.quantity}</span>
                      </div>
                    )}
                    
                    {item.margin !== undefined && (
                      <div className="flex flex-col">
                        <span className="text-muted-foreground text-xs">Marge</span>
                        <span>{item.margin}%</span>
                      </div>
                    )}
                    
                    {item.description && (
                      <div className="col-span-2 mt-2">
                        <span className="text-muted-foreground text-xs">Description</span>
                        <p className="mt-1">{item.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-4">
                Aucune information détaillée disponible sur l'équipement
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContractsTable;
