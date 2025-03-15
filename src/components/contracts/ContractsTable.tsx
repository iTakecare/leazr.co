
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
import { MoreHorizontal, FileText, Trash2, Package, CheckCircle, Truck, Play, AlarmClock } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Contract, contractStatuses } from "@/services/contractService";
import ContractStatusBadge from "@/components/contracts/ContractStatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

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
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusChangeReason, setStatusChangeReason] = useState('');

  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [carrier, setCarrier] = useState('');
  
  const handleRowClick = (contractId: string) => {
    // Navigation vers les détails du contrat à implémenter
    // navigate(`/contracts/${contractId}`);
    console.log("Contrat sélectionné:", contractId);
  };
  
  const openStatusChangeDialog = (contract: Contract, status: string) => {
    setSelectedContract(contract);
    setTargetStatus(status);
    setStatusChangeReason('');
    setStatusDialogOpen(true);
  };
  
  const handleStatusChange = async () => {
    if (selectedContract && targetStatus) {
      await onStatusChange(selectedContract.id, targetStatus, statusChangeReason);
      setStatusDialogOpen(false);
    }
  };

  const openTrackingDialog = (contract: Contract) => {
    setSelectedContract(contract);
    setTrackingNumber('');
    setEstimatedDelivery('');
    setCarrier('');
    setTrackingDialogOpen(true);
  };

  const handleAddTracking = async () => {
    if (selectedContract && trackingNumber) {
      await onAddTrackingInfo(selectedContract.id, trackingNumber, estimatedDelivery, carrier);
      setTrackingDialogOpen(false);
    }
  };
  
  const getAvailableActions = (contract: Contract) => {
    const actions = [];
    
    actions.push({
      label: "Voir détails",
      icon: FileText,
      onClick: () => handleRowClick(contract.id),
    });
    
    switch (contract.status) {
      case contractStatuses.CONTRACT_SENT:
        actions.push({
          label: "Marquer comme signé",
          icon: CheckCircle,
          onClick: () => openStatusChangeDialog(contract, contractStatuses.CONTRACT_SIGNED),
        });
        break;
        
      case contractStatuses.CONTRACT_SIGNED:
        actions.push({
          label: "Marquer comme commandé",
          icon: Package,
          onClick: () => openStatusChangeDialog(contract, contractStatuses.EQUIPMENT_ORDERED),
        });
        break;
        
      case contractStatuses.EQUIPMENT_ORDERED:
        actions.push({
          label: "Ajouter numéro de suivi",
          icon: Truck,
          onClick: () => openTrackingDialog(contract),
        });
        if (contract.tracking_number) {
          actions.push({
            label: "Marquer comme livré",
            icon: CheckCircle,
            onClick: () => openStatusChangeDialog(contract, contractStatuses.DELIVERED),
          });
        }
        break;
        
      case contractStatuses.DELIVERED:
        actions.push({
          label: "Marquer comme actif",
          icon: Play,
          onClick: () => openStatusChangeDialog(contract, contractStatuses.ACTIVE),
        });
        break;
        
      case contractStatuses.ACTIVE:
        actions.push({
          label: "Marquer comme terminé",
          icon: AlarmClock,
          onClick: () => openStatusChangeDialog(contract, contractStatuses.COMPLETED),
        });
        break;
    }
    
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
                <TableRow key={contract.id}>
                  <TableCell 
                    className="font-medium cursor-pointer"
                    onClick={() => handleRowClick(contract.id)}
                  >
                    {`CON-${contract.id.slice(0, 8)}`}
                    {contract.tracking_number && (
                      <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                        Suivi
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{contract.client_name}</TableCell>
                  <TableCell>{formatCurrency(contract.monthly_payment || 0)}</TableCell>
                  <TableCell>{formatDate(contract.created_at)}</TableCell>
                  <TableCell>
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
      
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Changer le statut du contrat</DialogTitle>
            <DialogDescription>
              Vous pouvez ajouter une note facultative pour ce changement de statut.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <Textarea
              placeholder="Note (facultatif)..."
              value={statusChangeReason}
              onChange={(e) => setStatusChangeReason(e.target.value)}
              rows={4}
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleStatusChange}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un numéro de suivi</DialogTitle>
            <DialogDescription>
              Ajoutez les informations de suivi pour ce contrat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="tracking" className="text-sm font-medium">Numéro de suivi</label>
              <Input
                id="tracking"
                placeholder="Numéro de suivi..."
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="delivery" className="text-sm font-medium">Date de livraison estimée</label>
              <Input
                id="delivery"
                placeholder="Date de livraison estimée..."
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="carrier" className="text-sm font-medium">Transporteur</label>
              <Input
                id="carrier"
                placeholder="Transporteur..."
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAddTracking}
              disabled={!trackingNumber.trim()}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContractsTable;
