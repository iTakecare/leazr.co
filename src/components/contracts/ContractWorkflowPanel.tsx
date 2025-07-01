import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { CheckCircle, Clock, Package, Truck, Play, AlarmClock, Send, Zap } from "lucide-react";
import { Contract, contractStatuses, updateContractStatus, addTrackingNumber } from "@/services/contractService";
import { toast } from "sonner";

interface ContractWorkflowPanelProps {
  contract: Contract;
  onRefresh: () => void;
}

const ContractWorkflowPanel: React.FC<ContractWorkflowPanelProps> = ({ contract, onRefresh }) => {
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<string>('');
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [carrier, setCarrier] = useState('');

  const workflowSteps = [
    {
      id: contractStatuses.CONTRACT_SENT,
      label: "Envoyé",
      icon: Send,
      description: "Contrat envoyé au client"
    },
    {
      id: contractStatuses.CONTRACT_SIGNED,
      label: "Signé", 
      icon: CheckCircle,
      description: "Contrat signé par le client"
    },
    {
      id: contractStatuses.EQUIPMENT_ORDERED,
      label: "Commandé",
      icon: Package,
      description: "Équipement commandé"
    },
    {
      id: contractStatuses.DELIVERED,
      label: "Livré",
      icon: Truck,
      description: "Équipement livré"
    },
    {
      id: contractStatuses.ACTIVE,
      label: "Actif",
      icon: Play,
      description: "Contrat en cours"
    },
    {
      id: contractStatuses.COMPLETED,
      label: "Terminé",
      icon: AlarmClock,
      description: "Contrat terminé"
    }
  ];

  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.id === contract.status);
  };

  const getStepStatus = (stepIndex: number) => {
    const currentIndex = getCurrentStepIndex();
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getNextActions = () => {
    const actions = [];
    
    // Ajouter le tracking pour plusieurs statuts
    if ([contractStatuses.CONTRACT_SIGNED, contractStatuses.EQUIPMENT_ORDERED, contractStatuses.DELIVERED].includes(contract.status)) {
      actions.push({
        label: contract.tracking_number ? "Modifier suivi" : "Ajouter suivi",
        icon: Send,
        onClick: () => setTrackingDialogOpen(true),
        variant: "outline" as const
      });
    }
    
    const currentIndex = getCurrentStepIndex();
    const nextStep = workflowSteps[currentIndex + 1];
    
    if (nextStep) {
      // Condition spéciale pour la livraison
      if (nextStep.id === contractStatuses.DELIVERED && !contract.tracking_number) {
        return actions; // Ne pas permettre de marquer comme livré sans tracking
      }
      
      actions.push({
        label: `Passer à: ${nextStep.label}`,
        icon: nextStep.icon,
        onClick: () => {
          setTargetStatus(nextStep.id);
          setStatusChangeReason('');
          setStatusDialogOpen(true);
        },
        variant: "default" as const
      });
    }
    
    return actions;
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
        onRefresh();
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
        onRefresh();
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

  const nextActions = getNextActions();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Workflow du contrat
          </CardTitle>
          <CardDescription>
            Gérez l'avancement du contrat étape par étape
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Actions rapides */}
          {nextActions.length > 0 && (
            <div className="flex flex-wrap gap-3">
              {nextActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant}
                  onClick={action.onClick}
                  disabled={isUpdatingStatus}
                  className="flex items-center gap-2"
                >
                  <action.icon className="h-4 w-4" />
                  {action.label}
                </Button>
              ))}
            </div>
          )}

          {/* Timeline visuelle */}
          <div className="space-y-4">
            {workflowSteps.map((step, index) => {
              const status = getStepStatus(index);
              const Icon = step.icon;
              
              return (
                <div key={step.id} className="flex items-start gap-4">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      status === 'completed' 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : status === 'current'
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                    }`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {index < workflowSteps.length - 1 && (
                      <div className={`absolute top-10 left-1/2 transform -translate-x-1/2 w-0.5 h-8 ${
                        status === 'completed' ? 'bg-green-500' : 'bg-muted-foreground/20'
                      }`} />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{step.label}</h4>
                      {status === 'current' && (
                        <Badge variant="secondary">En cours</Badge>
                      )}
                      {status === 'completed' && (
                        <Badge variant="default">Terminé</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dialog changement de statut */}
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
            <Button onClick={handleStatusChange} disabled={isUpdatingStatus}>
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog tracking */}
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
              disabled={!trackingNumber.trim() || isUpdatingStatus}
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ContractWorkflowPanel;