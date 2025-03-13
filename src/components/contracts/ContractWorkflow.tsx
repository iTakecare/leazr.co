
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  FileText, FileCheck, Package, Truck, CheckCircle, Clock, 
  ChevronDown, ChevronUp, History, Calendar
} from "lucide-react";
import { contractStatuses } from "@/services/contractService";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

const contractWorkflowSteps = [
  { 
    id: contractStatuses.CONTRACT_SENT, 
    label: "Contrat envoyé", 
    icon: FileText,
    nextSteps: [contractStatuses.CONTRACT_SIGNED],
    color: "blue"
  },
  { 
    id: contractStatuses.CONTRACT_SIGNED, 
    label: "Contrat signé", 
    icon: FileCheck,
    nextSteps: [contractStatuses.EQUIPMENT_ORDERED],
    color: "green"
  },
  { 
    id: contractStatuses.EQUIPMENT_ORDERED, 
    label: "Matériel commandé", 
    icon: Package,
    nextSteps: [contractStatuses.DELIVERED],
    color: "purple"
  },
  { 
    id: contractStatuses.DELIVERED, 
    label: "Livré", 
    icon: Truck,
    nextSteps: [contractStatuses.ACTIVE],
    color: "green"
  },
  { 
    id: contractStatuses.ACTIVE, 
    label: "Actif", 
    icon: CheckCircle,
    nextSteps: [contractStatuses.COMPLETED],
    color: "blue"
  },
  { 
    id: contractStatuses.COMPLETED, 
    label: "Terminé", 
    icon: Clock,
    nextSteps: [],
    color: "gray"
  }
];

function getNextStepOptions(currentStatus: string) {
  const currentStep = contractWorkflowSteps.find(step => step.id === currentStatus);
  if (!currentStep) return [];

  return currentStep.nextSteps.map(nextStepId => {
    const nextStep = contractWorkflowSteps.find(step => step.id === nextStepId);
    if (!nextStep) return { id: nextStepId, label: "Inconnu", description: "" };

    let description = "";
    switch (nextStepId) {
      case contractStatuses.CONTRACT_SIGNED:
        description = "Le contrat a été signé par le client";
        break;
      case contractStatuses.EQUIPMENT_ORDERED:
        description = "Le matériel a été commandé";
        break;
      case contractStatuses.DELIVERED:
        description = "Le matériel a été livré au client";
        break;
      case contractStatuses.ACTIVE:
        description = "Le contrat est maintenant actif";
        break;
      case contractStatuses.COMPLETED:
        description = "Le contrat est terminé";
        break;
      default:
        description = "Passer à cette étape";
    }

    return {
      id: nextStepId,
      label: nextStep.label,
      description
    };
  });
}

// Calculer le pourcentage de progression dans le workflow
function calculateProgress(currentStatus: string): number {
  const totalSteps = contractWorkflowSteps.length;
  const currentIndex = contractWorkflowSteps.findIndex(step => step.id === currentStatus);
  
  if (currentIndex === -1) return 0;
  return ((currentIndex + 1) / totalSteps) * 100;
}

interface ContractWorkflowProps {
  currentStatus: string;
  onStatusChange: (status: string, reason?: string) => Promise<void>;
  isUpdating: boolean;
  contractId: string;
  onAddTrackingInfo?: (trackingNumber: string, estimatedDelivery?: string, carrier?: string) => Promise<void>;
}

const ContractWorkflow: React.FC<ContractWorkflowProps> = ({ 
  currentStatus, 
  onStatusChange,
  isUpdating,
  contractId,
  onAddTrackingInfo
}) => {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [estimatedDelivery, setEstimatedDelivery] = useState("");
  const [carrier, setCarrier] = useState("bpost");

  const currentStepInfo = contractWorkflowSteps.find(step => step.id === currentStatus);
  const nextStepOptions = getNextStepOptions(currentStatus);
  const progress = calculateProgress(currentStatus);
  
  const handleNextStepSelect = (nextStepId: string) => {
    setSelectedStep(nextStepId);
    
    // Si on passe à l'étape "Livré" et qu'on a la fonction d'ajout de suivi
    if (nextStepId === contractStatuses.DELIVERED && onAddTrackingInfo) {
      setTrackingDialogOpen(true);
    } else {
      setConfirmOpen(true);
    }
  };

  const confirmStatusChange = async () => {
    if (selectedStep) {
      await onStatusChange(selectedStep, reason || undefined);
      setReason("");
      setConfirmOpen(false);
    }
  };

  const handleAddTracking = async () => {
    if (onAddTrackingInfo && trackingNumber) {
      await onAddTrackingInfo(trackingNumber, estimatedDelivery, carrier);
      setTrackingNumber("");
      setEstimatedDelivery("");
      setTrackingDialogOpen(false);
      
      // Passer à l'étape Livré
      if (selectedStep === contractStatuses.DELIVERED) {
        await onStatusChange(contractStatuses.DELIVERED, "Numéro de suivi ajouté: " + trackingNumber);
      }
    }
  };

  const getStatusColor = (status: string) => {
    const step = contractWorkflowSteps.find(s => s.id === status);
    if (!step) return "bg-gray-100 border-gray-300 text-gray-600";
    
    switch (step.color) {
      case "blue": return "bg-blue-100 border-blue-500 text-blue-600";
      case "green": return "bg-green-100 border-green-500 text-green-600";
      case "red": return "bg-red-100 border-red-500 text-red-600";
      case "yellow": return "bg-yellow-100 border-yellow-500 text-yellow-600";
      case "purple": return "bg-purple-100 border-purple-500 text-purple-600";
      case "gray": return "bg-gray-100 border-gray-300 text-gray-600";
      default: return "bg-gray-100 border-gray-300 text-gray-600";
    }
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-medium">Étapes du contrat</h3>
        <div className="text-sm text-muted-foreground">
          {progress.toFixed(0)}% complété
        </div>
      </div>
      
      <Progress value={progress} className="h-2 mb-6" />
      
      <div className="flex items-center justify-between mb-8">
        {contractWorkflowSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStatus;
          const isPassed = contractWorkflowSteps.findIndex(s => s.id === currentStatus) > index;
          
          return (
            <div 
              key={step.id}
              className={cn(
                "flex flex-col items-center relative",
                index > 0 && "flex-1"
              )}
            >
              {index > 0 && (
                <div className={cn(
                  "absolute top-3 w-full h-px -left-1/2",
                  isPassed ? "bg-primary" : "bg-gray-200"
                )} />
              )}
              
              <div 
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center z-10 border border-transparent",
                  isActive ? "bg-primary text-white" : 
                  isPassed ? "bg-primary/20 text-primary border-primary" : 
                  "bg-gray-100 text-gray-400"
                )}
              >
                <Icon className="h-3 w-3" />
              </div>
              
              <span 
                className={cn(
                  "text-xs mt-1 text-center max-w-[80px] truncate",
                  isActive ? "font-medium text-primary" : 
                  isPassed ? "text-primary/80" : "text-gray-500"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {nextStepOptions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-500">Passer à l'étape suivante :</p>
          <Select onValueChange={handleNextStepSelect}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Sélectionner la prochaine étape" />
            </SelectTrigger>
            <SelectContent>
              {nextStepOptions.map(option => (
                <SelectItem key={option.id} value={option.id}>
                  <div>
                    <span>{option.label}</span>
                    <p className="text-xs text-gray-500">{option.description}</p>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer le statut du contrat ?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStep && (
                <>
                  Vous allez changer le statut vers <strong>{contractWorkflowSteps.find(s => s.id === selectedStep)?.label}</strong>. 
                  Voulez-vous ajouter un commentaire?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Textarea
              placeholder="Ajouter un commentaire (optionnel)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <Button onClick={confirmStatusChange} disabled={isUpdating}>
              {isUpdating ? "Mise à jour..." : "Confirmer"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={trackingDialogOpen} onOpenChange={setTrackingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter des informations de livraison</DialogTitle>
            <DialogDescription>
              Ajoutez un numéro de suivi et une date de livraison estimée pour ce contrat.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="carrier">Transporteur</Label>
              <Select
                value={carrier}
                onValueChange={setCarrier}
              >
                <SelectTrigger id="carrier">
                  <SelectValue placeholder="Sélectionner un transporteur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bpost">bpost</SelectItem>
                  <SelectItem value="dhl">DHL</SelectItem>
                  <SelectItem value="ups">UPS</SelectItem>
                  <SelectItem value="fedex">FedEx</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tracking">Numéro de suivi</Label>
              <Input
                id="tracking"
                placeholder="123456789ABCDEF"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="delivery-date">Date de livraison estimée</Label>
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
              onClick={handleAddTracking}
              disabled={!trackingNumber}
            >
              Ajouter et continuer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContractWorkflow;
