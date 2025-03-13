
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  File, Clock, CheckCircle, XCircle, UserCog, MessagesSquare, 
  SendToBack, RefreshCw, ChevronDown
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

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

function getNextStepOptions(currentStatus: string) {
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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'simple'>('simple');

  const currentStepInfo = workflowSteps.find(step => step.id === currentStatus);
  const nextStepOptions = getNextStepOptions(currentStatus);
  
  const handleNextStepSelect = (nextStepId: string) => {
    console.log("Next step selected:", nextStepId);
    setSelectedStep(nextStepId);
    setConfirmOpen(true);
  };

  const confirmStatusChange = async () => {
    if (selectedStep) {
      await onStatusChange(selectedStep, reason || undefined);
      setReason("");
      setConfirmOpen(false);
    }
  };

  // Map workflow status to color classes
  const getStatusColor = (status: string) => {
    const step = workflowSteps.find(s => s.id === status);
    if (!step) return "bg-gray-100 border-gray-300 text-gray-600";
    
    switch (step.color) {
      case "blue": return "bg-blue-100 border-blue-500 text-blue-600";
      case "green": return "bg-green-100 border-green-500 text-green-600";
      case "red": return "bg-red-100 border-red-500 text-red-600";
      case "yellow": return "bg-yellow-100 border-yellow-500 text-yellow-600";
      case "purple": return "bg-purple-100 border-purple-500 text-purple-600";
      case "orange": return "bg-orange-100 border-orange-500 text-orange-600";
      default: return "bg-gray-100 border-gray-300 text-gray-600";
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-sm font-medium mb-4">Gestion du workflow</h3>
      
      <Tabs defaultValue="simple" onValueChange={(value) => setViewMode(value as 'visual' | 'simple')}>
        <TabsList className="mb-4">
          <TabsTrigger value="simple">Mode Simple</TabsTrigger>
          <TabsTrigger value="visual">Mode Visuel</TabsTrigger>
        </TabsList>
        
        <TabsContent value="simple" className="mt-2">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <div className={cn(
                "flex items-center px-3 py-2 rounded-md border-2",
                getStatusColor(currentStatus)
              )}>
                {currentStepInfo && (
                  <>
                    <currentStepInfo.icon className="h-5 w-5 mr-2" />
                    <span className="font-medium">{currentStepInfo.label}</span>
                  </>
                )}
              </div>
            </div>
            
            {nextStepOptions.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Passer à l'étape suivante:</p>
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
          </div>
        </TabsContent>
        
        <TabsContent value="visual" className="mt-2">
          <div className="flex flex-wrap items-center gap-2">
            {workflowSteps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStatus;
              const hasPassed = false; // Add logic to determine if step has been passed
              
              return (
                <React.Fragment key={step.id}>
                  {index > 0 && (
                    <div className="h-px w-4 bg-gray-200" />
                  )}
                  <div
                    className={cn(
                      "flex flex-col items-center",
                      isActive && "relative"
                    )}
                  >
                    <div 
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center border-2",
                        getStatusColor(step.id),
                        isActive && "ring-2 ring-offset-2 ring-primary/30"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <span 
                      className={cn(
                        "text-xs mt-1 text-center max-w-[80px] truncate",
                        isActive ? "font-medium text-primary" : "text-gray-500"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
          
          {nextStepOptions.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-gray-500">Passer à l'étape suivante:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {nextStepOptions.map(option => {
                  const targetStep = workflowSteps.find(s => s.id === option.id);
                  const TargetIcon = targetStep?.icon || File;
                  
                  return (
                    <Button
                      key={option.id}
                      variant="outline"
                      className={cn(
                        "justify-start text-left h-auto py-3",
                        getStatusColor(option.id)
                      )}
                      onClick={() => handleNextStepSelect(option.id)}
                    >
                      <div className="flex items-start">
                        <TargetIcon className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs mt-1">{option.description}</div>
                        </div>
                      </div>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
