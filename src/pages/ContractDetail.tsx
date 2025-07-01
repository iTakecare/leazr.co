import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, Send, Package, Truck, Play, AlarmClock, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { contractStatuses, updateContractStatus, addTrackingNumber } from "@/services/contractService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import ContractStatusBadge from "@/components/contracts/ContractStatusBadge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import PageTransition from "@/components/layout/PageTransition";
import ContractEquipmentSection from "@/components/contracts/ContractEquipmentSection";
import ContractDocumentsSection from "@/components/contracts/ContractDocumentsSection";
import { useContractDetail } from "@/hooks/useContractDetail";

const ContractDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { 
    contract, 
    equipment, 
    documents, 
    logs, 
    loading, 
    error, 
    refetch 
  } = useContractDetail(id || "");

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [carrier, setCarrier] = useState('');
  
  const openStatusChangeDialog = (status: string) => {
    setTargetStatus(status);
    setStatusChangeReason('');
    setStatusDialogOpen(true);
  };
  
  const openTrackingDialog = () => {
    setTrackingNumber('');
    setEstimatedDelivery('');
    setCarrier('');
    setTrackingDialogOpen(true);
  };
  
  const handleStatusChange = async () => {
    if (!contract || !targetStatus) return;
    
    try {
      setIsUpdatingStatus(true);
      
      const success = await updateContractStatus(
        contract.id, 
        targetStatus, 
        contract.status || contractStatuses.CONTRACT_SENT,
        statusChangeReason
      );
      
      if (success) {
        toast.success(`Statut du contrat mis à jour avec succès`);
        refetch();
        setStatusDialogOpen(false);
      } else {
        toast.error("Erreur lors de la mise à jour du statut du contrat");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du statut:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const handleAddTrackingInfo = async () => {
    if (!contract || !trackingNumber) return;
    
    try {
      setIsUpdatingStatus(true);
      
      const success = await addTrackingNumber(
        contract.id,
        trackingNumber,
        estimatedDelivery,
        carrier
      );
      
      if (success) {
        toast.success(`Informations de suivi ajoutées avec succès`);
        refetch();
        setTrackingDialogOpen(false);
      } else {
        toast.error("Erreur lors de l'ajout des informations de suivi");
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout des informations de suivi:", error);
      toast.error("Erreur lors de l'ajout des informations de suivi");
    } finally {
      setIsUpdatingStatus(false);
    }
  };
  
  const getAvailableActions = () => {
    if (!contract) return [];
    
    const actions = [];
    
    // Ajouter le tracking pour plusieurs statuts
    if ([contractStatuses.CONTRACT_SIGNED, contractStatuses.EQUIPMENT_ORDERED, contractStatuses.DELIVERED].includes(contract.status)) {
      actions.push({
        label: contract.tracking_number ? "Modifier suivi" : "Ajouter suivi",
        icon: Send,
        onClick: openTrackingDialog,
      });
    }
    
    switch (contract.status) {
      case contractStatuses.CONTRACT_SENT:
        actions.push({
          label: "Marquer comme signé",
          icon: FileText,
          onClick: () => openStatusChangeDialog(contractStatuses.CONTRACT_SIGNED),
        });
        break;
        
      case contractStatuses.CONTRACT_SIGNED:
        actions.push({
          label: "Marquer comme commandé",
          icon: Package,
          onClick: () => openStatusChangeDialog(contractStatuses.EQUIPMENT_ORDERED),
        });
        break;
        
      case contractStatuses.EQUIPMENT_ORDERED:
        if (contract.tracking_number) {
          actions.push({
            label: "Marquer comme livré",
            icon: Truck,
            onClick: () => openStatusChangeDialog(contractStatuses.DELIVERED),
          });
        }
        break;
        
      case contractStatuses.DELIVERED:
        actions.push({
          label: "Marquer comme actif",
          icon: Play,
          onClick: () => openStatusChangeDialog(contractStatuses.ACTIVE),
        });
        break;
        
      case contractStatuses.ACTIVE:
        actions.push({
          label: "Marquer comme terminé",
          icon: AlarmClock,
          onClick: () => openStatusChangeDialog(contractStatuses.COMPLETED),
        });
        break;
    }
    
    return actions;
  };
  
  const handleStepClick = (status: string) => {
    if (contract && status !== contract.status) {
      openStatusChangeDialog(status);
    }
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (error || !contract) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-red-500 font-medium">{error || "Le contrat n'a pas été trouvé."}</div>
        <Button onClick={() => navigate('/contracts')}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Retour aux contrats
        </Button>
      </div>
    );
  }
  
  const availableActions = getAvailableActions();
  
  return (
    <PageTransition>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/contracts')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">
              Contrat {`CON-${contract.id.slice(0, 8)}`}
            </h1>
            <ContractStatusBadge status={contract.status} />
          </div>
        </div>
        
        {/* Actions disponibles */}
        <div className="bg-gray-50 rounded-lg p-4 border">
          <h2 className="text-lg font-medium mb-4">
            Gestion du contrat - Étapes du workflow
          </h2>
          
          <div className="flex flex-wrap gap-3">
            {availableActions.map((action, index) => (
              <Button 
                key={`${action.label}-${index}`}
                onClick={action.onClick}
                disabled={isUpdatingStatus}
                size="lg"
              >
                <action.icon className="mr-2 h-5 w-5" />
                {action.label}
              </Button>
            ))}
            
            {availableActions.length === 0 && (
              <div className="text-gray-500 italic p-2">
                Aucune action disponible pour ce statut de contrat
              </div>
            )}
          </div>
          
          {/* Stepper visuel */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <ProgressStep 
                label="Contrat envoyé" 
                isActive={contract.status === contractStatuses.CONTRACT_SENT}
                isCompleted={[
                  contractStatuses.CONTRACT_SIGNED, 
                  contractStatuses.EQUIPMENT_ORDERED,
                  contractStatuses.DELIVERED,
                  contractStatuses.ACTIVE,
                  contractStatuses.COMPLETED
                ].includes(contract.status || '')}
                status={contractStatuses.CONTRACT_SENT}
                onClick={handleStepClick}
              />
              <ProgressLine />
              <ProgressStep 
                label="Contrat signé" 
                isActive={contract.status === contractStatuses.CONTRACT_SIGNED}
                isCompleted={[
                  contractStatuses.EQUIPMENT_ORDERED,
                  contractStatuses.DELIVERED,
                  contractStatuses.ACTIVE,
                  contractStatuses.COMPLETED
                ].includes(contract.status || '')}
                status={contractStatuses.CONTRACT_SIGNED}
                onClick={handleStepClick}
              />
              <ProgressLine />
              <ProgressStep 
                label="Équipement commandé" 
                isActive={contract.status === contractStatuses.EQUIPMENT_ORDERED}
                isCompleted={[
                  contractStatuses.DELIVERED,
                  contractStatuses.ACTIVE,
                  contractStatuses.COMPLETED
                ].includes(contract.status || '')}
                status={contractStatuses.EQUIPMENT_ORDERED}
                onClick={handleStepClick}
              />
              <ProgressLine />
              <ProgressStep 
                label="Livré" 
                isActive={contract.status === contractStatuses.DELIVERED}
                isCompleted={[
                  contractStatuses.ACTIVE,
                  contractStatuses.COMPLETED
                ].includes(contract.status || '')}
                status={contractStatuses.DELIVERED}
                onClick={handleStepClick}
              />
              <ProgressLine />
              <ProgressStep 
                label="Actif" 
                isActive={contract.status === contractStatuses.ACTIVE}
                isCompleted={[
                  contractStatuses.COMPLETED
                ].includes(contract.status || '')}
                status={contractStatuses.ACTIVE}
                onClick={handleStepClick}
              />
              <ProgressLine />
              <ProgressStep 
                label="Terminé" 
                isActive={contract.status === contractStatuses.COMPLETED}
                isCompleted={false}
                status={contractStatuses.COMPLETED}
                onClick={handleStepClick}
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Informations du contrat */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Détails du contrat</CardTitle>
              <CardDescription>Informations concernant ce contrat</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Client</div>
                  <div className="text-lg">{contract.client_name}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Email</div>
                  <div className="text-lg">{contract.client_email || contract.clients?.email || "Non spécifié"}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Montant total</div>
                  <div className="text-lg font-medium">{formatCurrency(contract.amount || 0)}</div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Paiement mensuel</div>
                  <div className="text-lg">{formatCurrency(contract.monthly_payment || 0)}</div>
                </div>
                {contract.lease_duration && (
                  <div>
                    <div className="text-sm font-medium text-gray-500">Durée</div>
                    <div className="text-lg">{contract.lease_duration} mois</div>
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-500">Bailleur</div>
                  <div className="text-lg">{contract.leaser_name}</div>
                </div>
              </div>
              
              {contract.tracking_number && (
                <>
                  <Separator className="my-6" />
                  <div>
                    <h3 className="text-lg font-medium mb-4">Informations de livraison</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-gray-500">Numéro de suivi</div>
                        <div className="text-lg">{contract.tracking_number}</div>
                      </div>
                      {contract.estimated_delivery && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">Livraison estimée</div>
                          <div className="text-lg">{contract.estimated_delivery}</div>
                        </div>
                      )}
                      {contract.delivery_carrier && (
                        <div>
                          <div className="text-sm font-medium text-gray-500">Transporteur</div>
                          <div className="text-lg">{contract.delivery_carrier}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
          
          {/* Historique */}
          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
              <CardDescription>Modifications de statut</CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length > 0 ? (
                <div className="space-y-4">
                  {logs.map((log, index) => (
                    <div key={`${log.id}-${index}`} className="border-l-2 border-blue-200 pl-4 py-2">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="font-medium">
                          {log.profiles?.first_name || log.user_name || 'Utilisateur'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(log.created_at)}
                        </div>
                      </div>
                      {log.previous_status !== log.new_status ? (
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <span>Statut changé de</span>
                          <ContractStatusBadge status={log.previous_status} />
                          <span>à</span>
                          <ContractStatusBadge status={log.new_status} />
                        </div>
                      ) : (
                        <div className="text-sm text-blue-600">
                          ℹ️ Action sur le contrat
                        </div>
                      )}
                      {log.reason && (
                        <div className="mt-2 text-sm text-gray-600">
                          {log.reason}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">Aucun historique disponible pour le contrat</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section Équipements */}
        <ContractEquipmentSection 
          equipment={equipment} 
          onRefresh={refetch}
        />

        {/* Section Documents */}
        <ContractDocumentsSection 
          contractId={contract.id}
          documents={documents}
          onRefresh={refetch}
        />
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
              Renseignez les informations de livraison pour ce contrat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-4">
            <div className="grid w-full gap-1.5">
              <label htmlFor="tracking-number" className="text-sm font-medium">
                Numéro de suivi
              </label>
              <Input
                id="tracking-number"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="123456789"
                required
              />
            </div>
            
            <div className="grid w-full gap-1.5">
              <label htmlFor="carrier" className="text-sm font-medium">
                Transporteur
              </label>
              <Input
                id="carrier"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="DHL, UPS, ..."
              />
            </div>
            
            <div className="grid w-full gap-1.5">
              <label htmlFor="delivery-date" className="text-sm font-medium">
                Date de livraison estimée
              </label>
              <Input
                id="delivery-date"
                type="date"
                value={estimatedDelivery}
                onChange={(e) => setEstimatedDelivery(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrackingDialogOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={handleAddTrackingInfo}
              disabled={!trackingNumber.trim()}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
};

const ProgressStep = ({ 
  label, 
  isActive, 
  isCompleted, 
  status,
  onClick
}: { 
  label: string; 
  isActive: boolean; 
  isCompleted: boolean;
  status: string;
  onClick: (status: string) => void;
}) => {
  const getClassName = () => {
    if (isActive) return "bg-blue-600 text-white";
    if (isCompleted) return "bg-green-500 text-white";
    return "bg-gray-200 text-gray-700";
  };
  
  return (
    <div 
      className="flex flex-col items-center cursor-pointer"
      onClick={() => onClick(status)}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getClassName()}`}>
        {isCompleted ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <span>{label.charAt(0)}</span>
        )}
      </div>
      <div className="text-xs mt-1 text-center max-w-[80px]">{label}</div>
    </div>
  );
};

const ProgressLine = () => {
  return (
    <div className="h-0.5 bg-gray-200 flex-grow mx-2"></div>
  );
};

export default ContractDetail;
