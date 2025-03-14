
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Check, AlertCircle, Clock, FileText, Info, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Définition des statuts possibles
export const WORKFLOW_STAGES = {
  DRAFT: {
    id: 'draft',
    label: 'Brouillon',
    color: 'bg-gray-100',
    textColor: 'text-gray-700',
    icon: FileText,
    description: "L'offre est en cours de préparation"
  },
  CLIENT_WAITING: {
    id: 'client_waiting',
    label: 'Attente client',
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
    icon: Clock,
    description: "En attente de la réponse du client"
  },
  CLIENT_APPROVED: {
    id: 'client_approved',
    label: 'Approuvée client',
    color: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    icon: Check,
    description: "Le client a approuvé l'offre"
  },
  INTERNAL_REVIEW: {
    id: 'internal_review',
    label: 'Revue interne',
    color: 'bg-blue-100',
    textColor: 'text-blue-700',
    icon: FileText,
    description: "En cours d'examen par l'équipe interne"
  },
  NEED_INFO: {
    id: 'need_info',
    label: 'Info. requises',
    color: 'bg-amber-100',
    textColor: 'text-amber-700',
    icon: Info,
    description: "Informations supplémentaires nécessaires"
  },
  LEASER_SENT: {
    id: 'leaser_sent',
    label: 'Envoyée bailleur',
    color: 'bg-purple-100',
    textColor: 'text-purple-700',
    icon: Clock,
    description: "L'offre a été transmise au bailleur"
  },
  LEASER_APPROVED: {
    id: 'leaser_approved',
    label: 'Approuvée bailleur',
    color: 'bg-green-100',
    textColor: 'text-green-700',
    icon: Check,
    description: "Le bailleur a approuvé l'offre"
  },
  LEASER_REJECTED: {
    id: 'leaser_rejected',
    label: 'Rejetée bailleur',
    color: 'bg-red-100',
    textColor: 'text-red-700',
    icon: X,
    description: "Le bailleur a rejeté l'offre"
  }
};

// Définition des transitions possibles entre statuts
const WORKFLOW_TRANSITIONS = {
  'draft': ['client_waiting', 'internal_review', 'need_info'],
  'client_waiting': ['client_approved', 'need_info'],
  'client_approved': ['internal_review', 'need_info'],
  'internal_review': ['leaser_sent', 'need_info'],
  'need_info': ['draft', 'client_waiting', 'internal_review'],
  'leaser_sent': ['leaser_approved', 'leaser_rejected'],
  'leaser_approved': [], // Statut final, pas de transition possible
  'leaser_rejected': ['draft', 'internal_review'] // Possibilité de recommencer
};

interface OfferWorkflowSimpleProps {
  currentStatus: string;
  offerId: string;
  isConverted?: boolean;
  onStatusChange: (offerId: string, newStatus: string, reason?: string) => Promise<void>;
  isUpdating: boolean;
}

const OfferWorkflowSimple: React.FC<OfferWorkflowSimpleProps> = ({
  currentStatus,
  offerId,
  isConverted = false,
  onStatusChange,
  isUpdating
}) => {
  const [reasonText, setReasonText] = useState("");
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  // Validation du statut actuel
  const validStatus = Object.values(WORKFLOW_STAGES).some(stage => stage.id === currentStatus)
    ? currentStatus
    : WORKFLOW_STAGES.DRAFT.id;

  // Récupération des informations du statut actuel
  const currentStageInfo = Object.values(WORKFLOW_STAGES).find(stage => stage.id === validStatus) 
    || WORKFLOW_STAGES.DRAFT;

  // Récupération des transitions possibles
  const possibleTransitions = isConverted ? [] : WORKFLOW_TRANSITIONS[validStatus as keyof typeof WORKFLOW_TRANSITIONS] || [];
  
  // Récupération des informations des statuts possibles
  const nextPossibleStages = possibleTransitions.map(stageId => 
    Object.values(WORKFLOW_STAGES).find(stage => stage.id === stageId)
  ).filter(Boolean);

  const handleStageSelection = (stageId: string) => {
    if (isUpdating || isConverted) return;
    
    const requiresReason = ['leaser_rejected'].includes(stageId);
    
    if (requiresReason) {
      setSelectedStatus(stageId);
      setShowReasonInput(true);
    } else {
      handleStatusUpdate(stageId);
    }
  };

  const handleStatusUpdate = async (stageId: string, reason?: string) => {
    try {
      await onStatusChange(offerId, stageId, reason);
      if (reason) setReasonText("");
      setShowReasonInput(false);
      setSelectedStatus(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erreur lors de la mise à jour du statut");
    }
  };

  const handleConfirmWithReason = () => {
    if (!selectedStatus) return;
    handleStatusUpdate(selectedStatus, reasonText);
  };

  const handleCancelReason = () => {
    setShowReasonInput(false);
    setSelectedStatus(null);
    setReasonText("");
  };

  // Composant pour les étapes du workflow
  const StageIcon = currentStageInfo.icon;

  return (
    <div className="space-y-4">
      {/* Affichage du statut actuel */}
      <div className={cn("p-3 rounded-md flex items-center", currentStageInfo.color)}>
        <StageIcon className={cn("mr-3 h-5 w-5", currentStageInfo.textColor)} />
        <div>
          <h3 className="font-medium">{currentStageInfo.label}</h3>
          <p className="text-sm text-muted-foreground">{currentStageInfo.description}</p>
        </div>
      </div>
      
      {/* Si converti en contrat */}
      {isConverted && (
        <div className="bg-green-100 text-green-800 p-3 rounded-md flex items-center">
          <Check className="mr-2 h-5 w-5" />
          <p>Cette offre a été convertie en contrat</p>
        </div>
      )}
      
      {/* Étapes suivantes possibles */}
      {!isConverted && nextPossibleStages.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Faire avancer cette offre vers:</h4>
          <div className="flex flex-wrap gap-2">
            {nextPossibleStages.map((stage) => {
              if (!stage) return null;
              const StageButtonIcon = stage.icon;
              return (
                <Button
                  key={stage.id}
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex items-center gap-1", 
                    stage.textColor,
                    "hover:bg-gray-100"
                  )}
                  onClick={() => handleStageSelection(stage.id)}
                  disabled={isUpdating}
                >
                  {isUpdating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <StageButtonIcon className="h-3 w-3" />
                  )}
                  {stage.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Modal pour la raison du changement */}
      {showReasonInput && selectedStatus && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full p-4">
            <h3 className="text-lg font-medium mb-2">Motif du changement</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Veuillez indiquer la raison de ce changement de statut.
            </p>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Raison du changement..."
              className="min-h-[100px] mb-4"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancelReason}>
                Annuler
              </Button>
              <Button onClick={handleConfirmWithReason} disabled={isUpdating}>
                {isUpdating ? (
                  <div className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Mise à jour...</span>
                  </div>
                ) : (
                  "Confirmer"
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default OfferWorkflowSimple;
