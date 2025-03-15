
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, FileText, Trash2, Package, CheckCircle, Truck, Play, AlarmClock, BarChart2 } from "lucide-react";
import { formatDate, formatCurrency } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { Contract, contractStatuses } from "@/services/contractService";
import ContractStatusBadge from "@/components/contracts/ContractStatusBadge";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  
  // Add state for contract details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  
  const handleRowClick = (contract: Contract) => {
    setSelectedContract(contract);
    setDetailsDialogOpen(true);
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
      onClick: () => handleRowClick(contract),
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
                <TableRow key={contract.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell 
                    className="font-medium"
                    onClick={() => handleRowClick(contract)}
                  >
                    {`CON-${contract.id.slice(0, 8)}`}
                    {contract.tracking_number && (
                      <Badge variant="outline" className="ml-2 bg-blue-50 text-blue-700 border-blue-200">
                        Suivi
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={() => handleRowClick(contract)}>{contract.client_name}</TableCell>
                  <TableCell onClick={() => handleRowClick(contract)}>{formatCurrency(contract.monthly_payment || 0)}</TableCell>
                  <TableCell onClick={() => handleRowClick(contract)}>{formatDate(contract.created_at)}</TableCell>
                  <TableCell onClick={() => handleRowClick(contract)}>
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
      
      {/* Status Change Dialog */}
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

      {/* Tracking Dialog */}
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

      {/* Contract Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Détails du contrat</DialogTitle>
            <DialogDescription>
              Informations détaillées sur le contrat 
              {selectedContract && ` CON-${selectedContract.id.slice(0, 8)}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedContract && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Informations client</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Nom</dt>
                        <dd className="font-medium">{selectedContract.client_name}</dd>
                      </div>
                      {selectedContract.client_email && (
                        <div>
                          <dt className="text-muted-foreground">Email</dt>
                          <dd className="font-medium">{selectedContract.client_email}</dd>
                        </div>
                      )}
                      {selectedContract.client_phone && (
                        <div>
                          <dt className="text-muted-foreground">Téléphone</dt>
                          <dd className="font-medium">{selectedContract.client_phone}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Informations financières</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Mensualité</dt>
                        <dd className="font-medium">{formatCurrency(selectedContract.monthly_payment || 0)}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Montant total</dt>
                        <dd className="font-medium">{formatCurrency(selectedContract.amount || 0)}</dd>
                      </div>
                      {selectedContract.lease_duration && (
                        <div>
                          <dt className="text-muted-foreground">Durée</dt>
                          <dd className="font-medium">{selectedContract.lease_duration} mois</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Equipement</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{selectedContract.equipment_description || "Non spécifié"}</p>
                </CardContent>
              </Card>

              {selectedContract.tracking_number && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Informations de livraison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Numéro de suivi</dt>
                        <dd className="font-medium">{selectedContract.tracking_number}</dd>
                      </div>
                      {selectedContract.estimated_delivery && (
                        <div>
                          <dt className="text-muted-foreground">Livraison estimée</dt>
                          <dd className="font-medium">{selectedContract.estimated_delivery}</dd>
                        </div>
                      )}
                      {selectedContract.delivery_carrier && (
                        <div>
                          <dt className="text-muted-foreground">Transporteur</dt>
                          <dd className="font-medium">{selectedContract.delivery_carrier}</dd>
                        </div>
                      )}
                    </dl>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Statut et dates</CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="space-y-2 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Statut</dt>
                      <dd className="font-medium">
                        <ContractStatusBadge status={selectedContract.status} showProgress />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Créé le</dt>
                      <dd className="font-medium">{formatDate(selectedContract.created_at)}</dd>
                    </div>
                    {selectedContract.updated_at && (
                      <div>
                        <dt className="text-muted-foreground">Dernière mise à jour</dt>
                        <dd className="font-medium">{formatDate(selectedContract.updated_at)}</dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setDetailsDialogOpen(false)}>Fermer</Button>
            {selectedContract && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">
                    Actions <MoreHorizontal className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {selectedContract.status === contractStatuses.CONTRACT_SENT && (
                    <DropdownMenuItem onClick={() => {
                      setDetailsDialogOpen(false);
                      openStatusChangeDialog(selectedContract, contractStatuses.CONTRACT_SIGNED);
                    }}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Marquer comme signé
                    </DropdownMenuItem>
                  )}
                  
                  {selectedContract.status === contractStatuses.CONTRACT_SIGNED && (
                    <DropdownMenuItem onClick={() => {
                      setDetailsDialogOpen(false);
                      openStatusChangeDialog(selectedContract, contractStatuses.EQUIPMENT_ORDERED);
                    }}>
                      <Package className="mr-2 h-4 w-4" />
                      Marquer comme commandé
                    </DropdownMenuItem>
                  )}
                  
                  {selectedContract.status === contractStatuses.EQUIPMENT_ORDERED && (
                    <>
                      <DropdownMenuItem onClick={() => {
                        setDetailsDialogOpen(false);
                        openTrackingDialog(selectedContract);
                      }}>
                        <Truck className="mr-2 h-4 w-4" />
                        Ajouter numéro de suivi
                      </DropdownMenuItem>
                      
                      {selectedContract.tracking_number && (
                        <DropdownMenuItem onClick={() => {
                          setDetailsDialogOpen(false);
                          openStatusChangeDialog(selectedContract, contractStatuses.DELIVERED);
                        }}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Marquer comme livré
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                  
                  {selectedContract.status === contractStatuses.DELIVERED && (
                    <DropdownMenuItem onClick={() => {
                      setDetailsDialogOpen(false);
                      openStatusChangeDialog(selectedContract, contractStatuses.ACTIVE);
                    }}>
                      <Play className="mr-2 h-4 w-4" />
                      Marquer comme actif
                    </DropdownMenuItem>
                  )}
                  
                  {selectedContract.status === contractStatuses.ACTIVE && (
                    <DropdownMenuItem onClick={() => {
                      setDetailsDialogOpen(false);
                      openStatusChangeDialog(selectedContract, contractStatuses.COMPLETED);
                    }}>
                      <AlarmClock className="mr-2 h-4 w-4" />
                      Marquer comme terminé
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContractsTable;
