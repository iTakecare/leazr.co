
import React, { useState, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Contract, contractStatuses } from "@/services/contractService";
import { formatCurrency } from "@/utils/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import {
  MoreHorizontal,
  Eye,
  Trash2,
  FileText,
  Package,
  Send,
  Truck,
  Calendar,
  CheckCheck,
  Clock,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { formatEquipmentForClient } from "@/utils/clientEquipmentFormatter";

type SortColumn = 'date' | 'client' | 'leaser' | 'monthly_payment' | 'start_date' | 'end_date' | 'status';
type SortDirection = 'asc' | 'desc';

interface ContractsTableProps {
  contracts: Contract[];
  onStatusChange: (contractId: string, newStatus: string) => Promise<void>;
  onAddTrackingInfo: (
    contractId: string,
    trackingNumber: string,
    estimatedDelivery?: string,
    carrier?: string
  ) => Promise<void>;
  onDeleteContract: (contractId: string) => Promise<void>;
  isUpdatingStatus: boolean;
  isDeleting: boolean;
}

interface SortableTableHeadProps {
  column: SortColumn;
  label: string;
  currentSort: SortColumn;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
  className?: string;
}

const SortableTableHead: React.FC<SortableTableHeadProps> = ({
  column,
  label,
  currentSort,
  direction,
  onSort,
  className = "",
}) => {
  const isActive = currentSort === column;
  
  return (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/50 transition-colors select-none ${className}`}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive ? (
          direction === 'asc' ? (
            <ChevronUp className="h-4 w-4 text-primary" />
          ) : (
            <ChevronDown className="h-4 w-4 text-primary" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
};

const ContractsTable: React.FC<ContractsTableProps> = ({
  contracts,
  onStatusChange,
  onAddTrackingInfo,
  onDeleteContract,
  isUpdatingStatus,
  isDeleting,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [trackingInfo, setTrackingInfo] = useState({
    trackingNumber: "",
    estimatedDelivery: "",
    carrier: "",
  });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  
  // État de tri
  const [sortColumn, setSortColumn] = useState<SortColumn>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Contrats triés
  const sortedContracts = useMemo(() => {
    return [...contracts].sort((a, b) => {
      let comparison = 0;
      
      switch (sortColumn) {
        case 'date':
          comparison = new Date(a.contract_start_date || a.created_at).getTime() - 
                       new Date(b.contract_start_date || b.created_at).getTime();
          break;
        case 'client':
          comparison = (a.client_name || '').localeCompare(b.client_name || '', 'fr');
          break;
        case 'leaser':
          comparison = (a.leaser_name || '').localeCompare(b.leaser_name || '', 'fr');
          break;
        case 'monthly_payment':
          comparison = (a.monthly_payment || 0) - (b.monthly_payment || 0);
          break;
        case 'start_date':
          const aStart = a.contract_start_date ? new Date(a.contract_start_date).getTime() : 0;
          const bStart = b.contract_start_date ? new Date(b.contract_start_date).getTime() : 0;
          comparison = aStart - bStart;
          break;
        case 'end_date':
          const aEnd = a.contract_end_date ? new Date(a.contract_end_date).getTime() : 0;
          const bEnd = b.contract_end_date ? new Date(b.contract_end_date).getTime() : 0;
          comparison = aEnd - bEnd;
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '', 'fr');
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [contracts, sortColumn, sortDirection]);

  if (!contracts.length) {
    return (
      <div className="text-center p-8 bg-gray-50 rounded-md">
        <p className="text-gray-500">Aucun contrat trouvé.</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case contractStatuses.CONTRACT_SENT:
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Send className="mr-1 h-3 w-3" />
            Envoyé
          </Badge>
        );
      case contractStatuses.CONTRACT_SIGNED:
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <FileText className="mr-1 h-3 w-3" />
            Signé
          </Badge>
        );
      case contractStatuses.EQUIPMENT_ORDERED:
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
            <Package className="mr-1 h-3 w-3" />
            Commandé
          </Badge>
        );
      case contractStatuses.DELIVERED:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Truck className="mr-1 h-3 w-3" />
            Livré
          </Badge>
        );
      case contractStatuses.ACTIVE:
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCheck className="mr-1 h-3 w-3" />
            Actif
          </Badge>
        );
      case contractStatuses.EXTENDED:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
            <Clock className="mr-1 h-3 w-3" />
            Prolongé
          </Badge>
        );
      case contractStatuses.COMPLETED:
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            <Clock className="mr-1 h-3 w-3" />
            Terminé
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {status}
          </Badge>
        );
    }
  };

  const handleViewDetails = (contractId: string) => {
    const companySlug = location.pathname.match(/^\/([^\/]+)\/(admin|client|ambassador)/)?.[1];
    if (companySlug) {
      navigate(`/${companySlug}/admin/contracts/${contractId}`);
    } else {
      navigate(`/contracts/${contractId}`);
    }
  };

  const handleAddTracking = (contractId: string) => {
    setSelectedContractId(contractId);
    setTrackingInfo({
      trackingNumber: "",
      estimatedDelivery: "",
      carrier: "",
    });
    setShowTrackingDialog(true);
  };

  const handleSubmitTracking = async () => {
    if (!selectedContractId || !trackingInfo.trackingNumber) {
      return;
    }

    await onAddTrackingInfo(
      selectedContractId,
      trackingInfo.trackingNumber,
      trackingInfo.estimatedDelivery,
      trackingInfo.carrier
    );

    setShowTrackingDialog(false);
    setSelectedContractId(null);
  };

  const handleDelete = (contractId: string) => {
    setSelectedContractId(contractId);
    setShowDeleteAlert(true);
  };

  const confirmDelete = async () => {
    if (selectedContractId) {
      await onDeleteContract(selectedContractId);
      setShowDeleteAlert(false);
      setSelectedContractId(null);
    }
  };

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead
                column="date"
                label="Date"
                currentSort={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                column="client"
                label="Client"
                currentSort={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <TableHead>Matériel</TableHead>
              <SortableTableHead
                column="leaser"
                label="Bailleur"
                currentSort={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                column="monthly_payment"
                label="Mensualité"
                currentSort={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
                className="text-right"
              />
              <SortableTableHead
                column="start_date"
                label="Date début"
                currentSort={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                column="end_date"
                label="Date fin"
                currentSort={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableTableHead
                column="status"
                label="Statut"
                currentSort={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedContracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    {formatDate(contract.contract_start_date || contract.created_at)}
                  </div>
                </TableCell>
                <TableCell>{contract.client_name}</TableCell>
                 <TableCell className="max-w-[200px] truncate">
                   {formatEquipmentForClient(contract.equipment_description)}
                 </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {contract.leaser_logo && (
                      <img 
                        src={contract.leaser_logo} 
                        alt={contract.leaser_name} 
                        className="w-5 h-5 mr-2 rounded-full" 
                      />
                    )}
                    {contract.leaser_name}
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(contract.monthly_payment)}
                </TableCell>
                <TableCell>
                  {contract.contract_start_date ? (
                    formatDate(contract.contract_start_date)
                  ) : (
                    <span className="text-muted-foreground text-sm">Non définie</span>
                  )}
                </TableCell>
                <TableCell>
                  {contract.contract_end_date ? (
                    formatDate(contract.contract_end_date)
                  ) : (
                    <span className="text-muted-foreground text-sm">Non définie</span>
                  )}
                </TableCell>
                <TableCell>
                  {getStatusBadge(contract.status)}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir le menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleViewDetails(contract.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Voir détails
                      </DropdownMenuItem>
                      
                      {contract.status === contractStatuses.CONTRACT_SENT && (
                        <DropdownMenuItem 
                          onClick={() => onStatusChange(contract.id, contractStatuses.CONTRACT_SIGNED)}
                          disabled={isUpdatingStatus}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Marquer comme signé
                        </DropdownMenuItem>
                      )}
                      
                      {contract.status === contractStatuses.CONTRACT_SIGNED && (
                        <DropdownMenuItem 
                          onClick={() => onStatusChange(contract.id, contractStatuses.EQUIPMENT_ORDERED)}
                          disabled={isUpdatingStatus}
                        >
                          <Package className="mr-2 h-4 w-4" />
                          Marquer comme commandé
                        </DropdownMenuItem>
                      )}
                      
                      {contract.status === contractStatuses.EQUIPMENT_ORDERED && (
                        <DropdownMenuItem 
                          onClick={() => handleAddTracking(contract.id)}
                          disabled={isUpdatingStatus}
                        >
                          <Truck className="mr-2 h-4 w-4" />
                          Ajouter suivi de livraison
                        </DropdownMenuItem>
                      )}
                      
                      {contract.status === contractStatuses.EQUIPMENT_ORDERED && contract.tracking_number && (
                        <DropdownMenuItem 
                          onClick={() => onStatusChange(contract.id, contractStatuses.DELIVERED)}
                          disabled={isUpdatingStatus}
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          Marquer comme livré
                        </DropdownMenuItem>
                      )}
                      
                      {contract.status === contractStatuses.DELIVERED && (
                        <DropdownMenuItem 
                          onClick={() => onStatusChange(contract.id, contractStatuses.ACTIVE)}
                          disabled={isUpdatingStatus}
                        >
                          <CheckCheck className="mr-2 h-4 w-4" />
                          Marquer comme actif
                        </DropdownMenuItem>
                      )}
                      
                      {contract.status === contractStatuses.ACTIVE && (
                        <DropdownMenuItem 
                          onClick={() => onStatusChange(contract.id, contractStatuses.COMPLETED)}
                          disabled={isUpdatingStatus}
                        >
                          <Clock className="mr-2 h-4 w-4" />
                          Marquer comme terminé
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuItem
                        onClick={() => handleDelete(contract.id)}
                        disabled={isDeleting}
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

      {/* Dialog pour ajouter les informations de suivi */}
      <Dialog open={showTrackingDialog} onOpenChange={setShowTrackingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter les informations de suivi</DialogTitle>
            <DialogDescription>
              Saisissez les détails de suivi pour ce contrat
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tracking-number">Numéro de suivi*</Label>
              <Input
                id="tracking-number"
                placeholder="Ex: TR123456789FR"
                value={trackingInfo.trackingNumber}
                onChange={(e) =>
                  setTrackingInfo({ ...trackingInfo, trackingNumber: e.target.value })
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="carrier">Transporteur</Label>
              <Input
                id="carrier"
                placeholder="Ex: Colissimo"
                value={trackingInfo.carrier}
                onChange={(e) =>
                  setTrackingInfo({ ...trackingInfo, carrier: e.target.value })
                }
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="estimated-delivery">Date de livraison estimée</Label>
              <Input
                id="estimated-delivery"
                placeholder="Ex: 20/05/2023"
                value={trackingInfo.estimatedDelivery}
                onChange={(e) =>
                  setTrackingInfo({ ...trackingInfo, estimatedDelivery: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTrackingDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitTracking} disabled={!trackingInfo.trackingNumber}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert de confirmation de suppression */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr de vouloir supprimer ce contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Elle supprimera définitivement ce contrat et permettra
              de reconvertir l'offre associée en contrat si nécessaire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-500 hover:bg-red-600">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ContractsTable;
