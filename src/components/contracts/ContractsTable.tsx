
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  X,
  Clock,
  Share2,
} from "lucide-react";

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

const ContractsTable: React.FC<ContractsTableProps> = ({
  contracts,
  onStatusChange,
  onAddTrackingInfo,
  onDeleteContract,
  isUpdatingStatus,
  isDeleting,
}) => {
  const navigate = useNavigate();
  const [showTrackingDialog, setShowTrackingDialog] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [trackingInfo, setTrackingInfo] = useState({
    trackingNumber: "",
    estimatedDelivery: "",
    carrier: "",
  });
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

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
    navigate(`/contracts/${contractId}`);
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
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Matériel</TableHead>
              <TableHead>Bailleur</TableHead>
              <TableHead className="text-right">Mensualité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Suivi</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contracts.map((contract) => (
              <TableRow key={contract.id}>
                <TableCell className="font-medium whitespace-nowrap">
                  <div className="flex items-center">
                    <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                    {formatDate(contract.created_at)}
                  </div>
                </TableCell>
                <TableCell>{contract.client_name}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {contract.equipment_description || "Non spécifié"}
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
                  {getStatusBadge(contract.status)}
                </TableCell>
                <TableCell>
                  {contract.tracking_number ? (
                    <div className="text-xs">
                      <div className="font-medium">{contract.tracking_number}</div>
                      <div className="text-muted-foreground">
                        {contract.delivery_carrier && `${contract.delivery_carrier} - `}
                        {contract.estimated_delivery && `Livraison: ${contract.estimated_delivery}`}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">Non suivi</span>
                  )}
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
