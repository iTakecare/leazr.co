
import React from "react";
import { cn } from "@/lib/utils";
import { 
  File, Clock, CheckCircle, XCircle, UserCog, MessagesSquare, 
  SendToBack, RefreshCw
} from "lucide-react";
import { workflowStatuses } from "@/hooks/useOffers";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

const workflowSteps = [
  { 
    id: workflowStatuses.DRAFT, 
    label: "Brouillon", 
    icon: File,
    nextSteps: [workflowStatuses.CLIENT_WAITING],
    color: "blue"
  },
  { 
    id: workflowStatuses.CLIENT_WAITING, 
    label: "En attente client", 
    icon: Clock,
    nextSteps: [workflowStatuses.CLIENT_APPROVED, workflowStatuses.CLIENT_NO_RESPONSE],
    color: "yellow"
  },
  { 
    id: workflowStatuses.CLIENT_APPROVED, 
    label: "Approuvé par client", 
    icon: CheckCircle,
    nextSteps: [workflowStatuses.INTERNAL_REVIEW],
    color: "green"
  },
  { 
    id: workflowStatuses.CLIENT_NO_RESPONSE, 
    label: "Sans réponse client", 
    icon: XCircle,
    nextSteps: [workflowStatuses.CLIENT_WAITING, workflowStatuses.DRAFT],
    color: "red"
  },
  { 
    id: workflowStatuses.INTERNAL_REVIEW, 
    label: "Revue interne", 
    icon: UserCog,
    nextSteps: [workflowStatuses.NEED_INFO, workflowStatuses.INTERNAL_REJECTED, workflowStatuses.LEASER_SENT],
    color: "purple"
  },
  { 
    id: workflowStatuses.NEED_INFO, 
    label: "Informations supplémentaires", 
    icon: MessagesSquare,
    nextSteps: [workflowStatuses.INTERNAL_REVIEW, workflowStatuses.DRAFT],
    color: "orange"
  },
  { 
    id: workflowStatuses.INTERNAL_REJECTED, 
    label: "Rejeté en interne", 
    icon: XCircle,
    nextSteps: [workflowStatuses.DRAFT],
    color: "red"
  },
  { 
    id: workflowStatuses.LEASER_SENT, 
    label: "Envoyé au bailleur", 
    icon: SendToBack,
    nextSteps: [workflowStatuses.LEASER_REVIEW],
    color: "blue"
  },
  { 
    id: workflowStatuses.LEASER_REVIEW, 
    label: "Revue bailleur", 
    icon: RefreshCw,
    nextSteps: [workflowStatuses.LEASER_APPROVED, workflowStatuses.LEASER_REJECTED],
    color: "purple"
  },
  { 
    id: workflowStatuses.LEASER_APPROVED, 
    label: "Approuvé par bailleur", 
    icon: CheckCircle,
    nextSteps: [],
    color: "green"
  },
  { 
    id: workflowStatuses.LEASER_REJECTED, 
    label: "Rejeté par bailleur", 
    icon: XCircle,
    nextSteps: [workflowStatuses.DRAFT, workflowStatuses.INTERNAL_REVIEW],
    color: "red"
  }
];

interface NextStepOption {
  id: string;
  label: string;
  description: string;
}

function getNextStepOptions(currentStatus: string): NextStepOption[] {
  const currentStep = workflowSteps.find(step => step.id === currentStatus);
  if (!currentStep) return [];

  return currentStep.nextSteps.map(nextStepId => {
    const nextStep = workflowSteps.find(step => step.id === nextStepId);
    if (!nextStep) return { id: nextStepId, label: "Inconnu", description: "" };

    let description = "";
    switch (nextStepId) {
      case workflowStatuses.CLIENT_WAITING:
        description = "Le devis est prêt à être envoyé au client";
        break;
      case workflowStatuses.CLIENT_APPROVED:
        description = "Le client a approuvé le devis";
        break;
      case workflowStatuses.CLIENT_NO_RESPONSE:
        description = "Le client n'a pas répondu";
        break;
      case workflowStatuses.INTERNAL_REVIEW:
        description = "Le devis doit être révisé en interne";
        break;
      case workflowStatuses.NEED_INFO:
        description = "Des informations supplémentaires sont nécessaires";
        break;
      case workflowStatuses.INTERNAL_REJECTED:
        description = "Le devis a été rejeté en interne";
        break;
      case workflowStatuses.LEASER_SENT:
        description = "Le devis est envoyé au bailleur";
        break;
      case workflowStatuses.LEASER_REVIEW:
        description = "Le devis est en cours de révision par le bailleur";
        break;
      case workflowStatuses.LEASER_APPROVED:
        description = "Le bailleur a approuvé le devis";
        break;
      case workflowStatuses.LEASER_REJECTED:
        description = "Le bailleur a rejeté le devis";
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

interface OfferWorkflowProps {
  currentStatus: string;
  onStatusChange: (status: string, reason?: string) => Promise<void>;
  isUpdating: boolean;
}

const OfferWorkflow: React.FC<OfferWorkflowProps> = ({ 
  currentStatus, 
  onStatusChange,
  isUpdating 
}) => {
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false);
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  
  const handleStepClick = (stepId: string) => {
    // Si c'est l'étape actuelle, ouvrir la boîte de dialogue pour changer le statut
    if (stepId === currentStatus) {
      const nextOptions = getNextStepOptions(currentStatus);
      if (nextOptions.length > 0) {
        setSelectedStep(stepId);
        setStepDialogOpen(true);
      }
    }
  };

  const handleNextStepSelect = (nextStepId: string) => {
    setSelectedStep(nextStepId);
    setStepDialogOpen(false);
    setStatusConfirmOpen(true);
  };

  const confirmStatusChange = async () => {
    if (selectedStep) {
      await onStatusChange(selectedStep, reason || undefined);
      setReason("");
      setStatusConfirmOpen(false);
    }
  };

  const getStepColor = (stepId: string) => {
    const step = workflowSteps.find(s => s.id === stepId);
    if (!step) return "gray";
    return step.color;
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-4">Étapes du workflow</h3>
      <div className="flex flex-wrap items-center gap-1 relative">
        {workflowSteps.map((step, index) => {
          const Icon = step.icon;
          const isActive = step.id === currentStatus;
          const isPassed = false; // À implémenter si besoin

          return (
            <React.Fragment key={`step-${step.id}`}>
              {index > 0 && (
                <div className="h-px w-5 bg-gray-200" key={`divider-${step.id}`} />
              )}
              <button
                type="button"
                onClick={() => handleStepClick(step.id)}
                className={cn(
                  "relative flex flex-col items-center group",
                  isActive && "cursor-pointer"
                )}
                key={`button-${step.id}`}
              >
                <div 
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2",
                    isActive 
                      ? `bg-${getStepColor(step.id)}-100 border-${getStepColor(step.id)}-500` 
                      : isPassed 
                        ? "bg-green-50 border-green-200" 
                        : "bg-gray-50 border-gray-200",
                    isActive && "ring-2 ring-offset-2 ring-primary/30"
                  )}
                >
                  <Icon 
                    className={cn(
                      "h-5 w-5",
                      isActive ? `text-${getStepColor(step.id)}-600` : "text-gray-400"
                    )} 
                  />
                </div>
                <span 
                  className={cn(
                    "text-xs mt-1 text-center",
                    isActive ? "font-medium text-primary" : "text-gray-500"
                  )}
                >
                  {step.label}
                </span>
              </button>
            </React.Fragment>
          );
        })}
      </div>

      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Changer le statut</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 py-2">
              {getNextStepOptions(currentStatus).map((option) => (
                <div
                  key={option.id}
                  onClick={() => handleNextStepSelect(option.id)}
                  className="flex items-center justify-between p-3 rounded-md border hover:bg-muted cursor-pointer"
                >
                  <div>
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-muted-foreground">{option.description}</div>
                  </div>
                  <div className="text-primary">→</div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStepDialogOpen(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={statusConfirmOpen} onOpenChange={setStatusConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Changer le statut de l'offre ?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStep && (
                <>
                  Vous allez changer le statut vers <strong>{workflowSteps.find(s => s.id === selectedStep)?.label}</strong>. 
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
    </div>
  );
};

export default OfferWorkflow;
