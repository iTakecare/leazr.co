import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  FileText, 
  XCircle, 
  ArrowRight, 
  ChevronDown, 
  Calendar, 
  Loader2, 
  Info
} from "lucide-react";
import { 
  Button, 
  Popover, 
  PopoverTrigger, 
  PopoverContent, 
  Textarea
} from "@/components/ui";
import { workflowStatuses } from "@/hooks/useOffers";
import { toast } from "sonner";
import { getWorkflowLogs } from "@/services/offerService";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// Ensure we're using the same status constants everywhere
const {
  DRAFT,
  CLIENT_WAITING,
  CLIENT_APPROVED,
  CLIENT_NO_RESPONSE,
  INTERNAL_REVIEW,
  NEED_INFO,
  INTERNAL_REJECTED,
  LEASER_SENT,
  LEASER_REVIEW,
  LEASER_APPROVED,
  LEASER_REJECTED
} = workflowStatuses;

// Define the workflow steps and their relationships
const workflowSteps = [
  {
    id: DRAFT,
    title: "Brouillon",
    description: "L'offre est en cours de préparation",
    icon: FileText,
    color: "text-gray-500",
    bgColor: "bg-gray-100"
  },
  {
    id: CLIENT_WAITING,
    title: "En attente du client",
    description: "Offre envoyée, en attente de réponse",
    icon: Clock,
    color: "text-orange-500",
    bgColor: "bg-orange-100",
    nextDefault: CLIENT_APPROVED
  },
  {
    id: CLIENT_APPROVED,
    title: "Approuvée par le client",
    description: "Le client a accepté l'offre",
    icon: CheckCircle,
    color: "text-emerald-500",
    bgColor: "bg-emerald-100",
    nextDefault: INTERNAL_REVIEW
  },
  {
    id: CLIENT_NO_RESPONSE,
    title: "Pas de réponse du client",
    description: "Le client n'a pas répondu dans les délais",
    icon: AlertCircle,
    color: "text-amber-500",
    bgColor: "bg-amber-100",
    nextDefault: LEASER_REJECTED
  },
  {
    id: INTERNAL_REVIEW,
    title: "Examen interne",
    description: "Vérification interne de l'offre",
    icon: FileText,
    color: "text-blue-500",
    bgColor: "bg-blue-100",
    nextDefault: LEASER_SENT
  },
  {
    id: NEED_INFO,
    title: "Informations manquantes",
    description: "Informations supplémentaires requises",
    icon: Info,
    color: "text-amber-500",
    bgColor: "bg-amber-100",
    nextDefault: INTERNAL_REVIEW
  },
  {
    id: INTERNAL_REJECTED,
    title: "Rejetée en interne",
    description: "L'offre a été rejetée lors de l'examen interne",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-100"
  },
  {
    id: LEASER_SENT,
    title: "Envoyée au bailleur",
    description: "L'offre a été transmise au bailleur",
    icon: Clock,
    color: "text-purple-500",
    bgColor: "bg-purple-100",
    nextDefault: LEASER_REVIEW
  },
  {
    id: LEASER_REVIEW,
    title: "En examen par le bailleur",
    description: "Le bailleur examine actuellement l'offre",
    icon: FileText,
    color: "text-indigo-500",
    bgColor: "bg-indigo-100",
    nextDefault: LEASER_APPROVED
  },
  {
    id: LEASER_APPROVED,
    title: "Approuvée par le bailleur",
    description: "Le bailleur a approuvé l'offre",
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-100"
  },
  {
    id: LEASER_REJECTED,
    title: "Rejetée par le bailleur",
    description: "Le bailleur a rejeté l'offre",
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-100"
  }
];

// Helper function to get the next step options based on the current status
const getNextStepOptions = (currentStatus: string) => {
  const predefinedFlows: Record<string, string[]> = {
    [DRAFT]: [CLIENT_WAITING, INTERNAL_REVIEW, NEED_INFO],
    [CLIENT_WAITING]: [CLIENT_APPROVED, CLIENT_NO_RESPONSE, NEED_INFO],
    [CLIENT_APPROVED]: [INTERNAL_REVIEW, NEED_INFO],
    [CLIENT_NO_RESPONSE]: [CLIENT_WAITING, INTERNAL_REJECTED],
    [INTERNAL_REVIEW]: [LEASER_SENT, NEED_INFO, INTERNAL_REJECTED],
    [NEED_INFO]: [CLIENT_WAITING, INTERNAL_REVIEW],
    [INTERNAL_REJECTED]: [],
    [LEASER_SENT]: [LEASER_REVIEW, NEED_INFO],
    [LEASER_REVIEW]: [LEASER_APPROVED, LEASER_REJECTED, NEED_INFO],
    [LEASER_APPROVED]: [],
    [LEASER_REJECTED]: [INTERNAL_REVIEW, CLIENT_WAITING]
  };

  const options = predefinedFlows[currentStatus] || [];
  return options.map(stepId => workflowSteps.find(step => step.id === stepId)).filter(Boolean);
};

// Component props interface
interface OfferWorkflowProps {
  currentStatus: string;
  onStatusChange: (status: string, reason?: string) => Promise<void>;
  isUpdating: boolean;
  offerId: string;
  isConverted?: boolean;
}

const OfferWorkflow: React.FC<OfferWorkflowProps> = ({
  currentStatus,
  onStatusChange,
  isUpdating,
  offerId,
  isConverted = false
}) => {
  const [changeReason, setChangeReason] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [workflowLogs, setWorkflowLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Validate if the current status is a valid workflow status
  const allStatuses = workflowSteps.map(step => step.id);
  const isValidStatus = allStatuses.includes(currentStatus);
  const validStatus = isValidStatus ? currentStatus : DRAFT;

  // Find the current step info and possible next steps
  const currentStepInfo = workflowSteps.find(step => step.id === validStatus) || workflowSteps[0];
  const nextStepOptions = isConverted ? [] : getNextStepOptions(validStatus);
  
  console.log("OfferWorkflow - currentStatus:", currentStatus);
  console.log("OfferWorkflow - validStatus:", validStatus);
  console.log("OfferWorkflow - isConverted:", isConverted);
  console.log("OfferWorkflow - nextStepOptions:", nextStepOptions.map(o => o?.id));

  // Fetch workflow logs when the component mounts or offerId changes
  useEffect(() => {
    if (offerId) {
      fetchWorkflowLogs();
    }
  }, [offerId]);

  const fetchWorkflowLogs = async () => {
    if (!offerId) return;
    
    setIsLoadingLogs(true);
    try {
      const logs = await getWorkflowLogs(offerId);
      setWorkflowLogs(logs);
    } catch (error) {
      console.error("Error fetching workflow logs:", error);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleStatusSelection = async (newStatus: string) => {
    console.log(`OfferWorkflow - Selected new status: ${newStatus}`);
    
    // Skip if status is unchanged
    if (newStatus === validStatus) {
      toast.info("Le statut est déjà à cette valeur");
      return;
    }
    
    // For most transitions, we can change directly
    if (!["client_no_response", "internal_rejected", "leaser_rejected"].includes(newStatus)) {
      await onStatusChange(newStatus);
      setSelectedStatus(null);
      return;
    }
    
    // For rejection statuses, we'll prompt for a reason
    setSelectedStatus(newStatus);
  };

  const confirmStatusChange = async () => {
    if (!selectedStatus) return;
    
    await onStatusChange(selectedStatus, changeReason);
    setSelectedStatus(null);
    setChangeReason("");
  };

  const cancelStatusChange = () => {
    setSelectedStatus(null);
    setChangeReason("");
  };

  const formatLogDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy à HH:mm", { locale: fr });
    } catch (error) {
      return "Date incorrecte";
    }
  };

  // Render the rejection reason modal
  const renderReasonModal = () => {
    if (!selectedStatus) return null;
    
    const statusInfo = workflowSteps.find(step => step.id === selectedStatus);
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h3 className="text-lg font-medium mb-2">Changer le statut</h3>
          <p className="text-muted-foreground mb-4">
            Vous allez changer le statut vers "{statusInfo?.title}". 
            Veuillez indiquer la raison de ce changement.
          </p>
          
          <Textarea
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            placeholder="Raison du changement de statut..."
            className="min-h-[100px] mb-4"
          />
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={cancelStatusChange}>
              Annuler
            </Button>
            <Button 
              onClick={confirmStatusChange}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Mise à jour...
                </>
              ) : (
                "Confirmer"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium mb-2">Progression du workflow</h3>
      
      {/* Current status display */}
      <div className={cn(
        "flex items-center p-3 mb-3 rounded-md",
        currentStepInfo.bgColor
      )}>
        <currentStepInfo.icon className={cn("h-5 w-5 mr-2", currentStepInfo.color)} />
        <div>
          <p className="font-medium">{currentStepInfo.title}</p>
          <p className="text-xs text-muted-foreground">{currentStepInfo.description}</p>
        </div>
      </div>
      
      {/* Converted to contract notice */}
      {isConverted && (
        <div className="p-3 mb-3 bg-green-100 text-green-800 rounded-md">
          <p className="flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Cette offre a été convertie en contrat. 
            Les modifications de statut sont désactivées.
          </p>
        </div>
      )}
      
      {/* Next step options */}
      {!isConverted && nextStepOptions.length > 0 && (
        <div className="mb-4">
          <h4 className="text-xs font-medium mb-2 text-muted-foreground">
            Prochaines étapes possibles:
          </h4>
          <div className="flex flex-wrap gap-2">
            {nextStepOptions.map((step) => (
              <Button
                key={step?.id}
                variant="outline"
                size="sm"
                className={cn(
                  "flex items-center",
                  step?.color,
                  "hover:bg-gray-100"
                )}
                onClick={() => handleStatusSelection(step?.id || "")}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                ) : (
                  <step.icon className="h-3 w-3 mr-1" />
                )}
                {step?.title}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Workflow history */}
      <div className="mt-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center text-muted-foreground"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Historique des statuts
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0">
            <div className="p-4 border-b">
              <h3 className="font-medium">Historique des changements</h3>
            </div>
            <div className="max-h-80 overflow-auto p-2">
              {isLoadingLogs ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : workflowLogs.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  Aucun historique disponible
                </p>
              ) : (
                <div className="space-y-3">
                  {workflowLogs.map((log, index) => {
                    const prevStatus = workflowSteps.find(s => s.id === log.previous_status);
                    const newStatus = workflowSteps.find(s => s.id === log.new_status);
                    
                    return (
                      <div key={index} className="p-2 border-b last:border-0">
                        <div className="flex justify-between">
                          <span className="text-sm font-medium">
                            {log.profiles?.first_name || 'Utilisateur'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatLogDate(log.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center mt-1 text-sm">
                          <span className={cn("inline-flex items-center", prevStatus?.color || "text-gray-500")}>
                            <prevStatus?.icon className="h-3 w-3 mr-1" />
                            {prevStatus?.title || log.previous_status}
                          </span>
                          <ArrowRight className="h-3 w-3 mx-2 text-muted-foreground" />
                          <span className={cn("inline-flex items-center", newStatus?.color || "text-gray-500")}>
                            <newStatus?.icon className="h-3 w-3 mr-1" />
                            {newStatus?.title || log.new_status}
                          </span>
                        </div>
                        {log.reason && (
                          <p className="text-xs text-muted-foreground mt-1 ml-1">
                            Raison: {log.reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Reason modal */}
      {renderReasonModal()}
    </div>
  );
};

export default OfferWorkflow;
