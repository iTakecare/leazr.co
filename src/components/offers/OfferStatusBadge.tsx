
import React from "react";
import { Badge } from "@/components/ui/badge";
import { 
  Check, Clock, FileText, AlertCircle, 
  Info, X, PenLine, User, Building, 
  ArrowRight, CreditCard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

export const WORKFLOW_STAGES = {
  DRAFT: {
    id: 'draft',
    label: 'Brouillon',
    color: 'bg-gray-100',
    textColor: 'text-gray-700',
    progressValue: 10,
    icon: PenLine,
    description: "L'offre est en cours de préparation"
  },
  CLIENT_WAITING: {
    id: 'client_waiting',
    label: 'Attente client',
    color: 'bg-orange-100',
    textColor: 'text-orange-700',
    progressValue: 25,
    icon: Clock,
    description: "En attente de la réponse du client"
  },
  CLIENT_APPROVED: {
    id: 'client_approved',
    label: 'Approuvée client',
    color: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    progressValue: 40,
    icon: User,
    description: "Le client a approuvé l'offre"
  },
  INTERNAL_REVIEW: {
    id: 'internal_review',
    label: 'Revue interne',
    color: 'bg-blue-100',
    textColor: 'text-blue-700',
    progressValue: 55,
    icon: FileText,
    description: "En cours d'examen par l'équipe interne"
  },
  NEED_INFO: {
    id: 'need_info',
    label: 'Info. requises',
    color: 'bg-amber-100',
    textColor: 'text-amber-700',
    progressValue: 30,
    icon: Info,
    description: "Informations supplémentaires nécessaires"
  },
  LEASER_SENT: {
    id: 'leaser_sent',
    label: 'Envoyée bailleur',
    color: 'bg-purple-100',
    textColor: 'text-purple-700',
    progressValue: 70,
    icon: Building,
    description: "L'offre a été transmise au bailleur"
  },
  LEASER_APPROVED: {
    id: 'leaser_approved',
    label: 'Approuvée bailleur',
    color: 'bg-green-100',
    textColor: 'text-green-700',
    progressValue: 100,
    icon: Check,
    description: "Le bailleur a approuvé l'offre"
  },
  LEASER_REJECTED: {
    id: 'leaser_rejected',
    label: 'Rejetée bailleur',
    color: 'bg-red-100',
    textColor: 'text-red-700',
    progressValue: 0,
    icon: X,
    description: "Le bailleur a rejeté l'offre"
  }
};

interface OfferStatusBadgeProps {
  status?: string;
  isConverted?: boolean;
  showProgress?: boolean;
}

const OfferStatusBadge: React.FC<OfferStatusBadgeProps> = ({ 
  status = 'draft', 
  isConverted = false,
  showProgress = false
}) => {
  // Si l'offre est convertie en contrat, on affiche un badge spécial
  if (isConverted) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900">
          <Check className="h-3 w-3 mr-1" />
          Convertie en contrat
        </Badge>
        {showProgress && <Progress value={100} className="h-2 bg-green-100" />}
      </div>
    );
  }

  // Récupérer les informations du statut
  const stageInfo = Object.values(WORKFLOW_STAGES).find(stage => stage.id === status) || WORKFLOW_STAGES.DRAFT;
  const Icon = stageInfo.icon;

  return (
    <div className="flex flex-col gap-1 w-full">
      <Badge className={cn(
        stageInfo.color,
        stageInfo.textColor,
        "hover:bg-opacity-80"
      )}>
        <Icon className="h-3 w-3 mr-1" />
        {stageInfo.label}
      </Badge>
      {showProgress && (
        <Progress 
          value={stageInfo.progressValue} 
          className={cn("h-2", 
            stageInfo.progressValue === 100 ? "bg-green-100" : 
            stageInfo.progressValue === 0 ? "bg-red-100" : "bg-gray-100"
          )} 
        />
      )}
    </div>
  );
};

export default OfferStatusBadge;
