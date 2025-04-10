
import React from "react";
import { CheckCircle, Clock, AlertCircle, Loader2, FileText } from "lucide-react";
import { OFFER_STATUSES } from "@/components/offers/OfferStatusBadge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface WorkflowVisualizerProps {
  currentStatus: string;
  completedStatuses: string[];
  onStatusChange?: (status: string) => void;
  lastUpdated?: string;
  onRequestDocuments?: () => void; // Nouvelle prop pour gérer la demande de documents
}

const OfferWorkflowVisualizer: React.FC<WorkflowVisualizerProps> = ({
  currentStatus,
  completedStatuses,
  onStatusChange,
  lastUpdated,
  onRequestDocuments
}) => {
  // Définir les étapes du workflow dans l'ordre
  const workflowSteps = [
    "draft",
    "sent",
    "client_review",
    "info_requested",
    "internal_review",
    "leaser_review",
    "approved",
    "rejected"
  ];

  const handleStepClick = (stepId: string) => {
    // Si c'est l'étape de demande d'informations, appeler le gestionnaire spécifique
    if (stepId === "info_requested" && onRequestDocuments) {
      onRequestDocuments();
      return;
    }
    
    // Sinon, gérer le changement de statut normalement
    if (onStatusChange) {
      onStatusChange(stepId);
    }
  };

  const getStepStatus = (stepId: string) => {
    if (stepId === "rejected" && currentStatus === "rejected") {
      return "current";
    }
    
    if (currentStatus === stepId) {
      return "current";
    }
    
    if (completedStatuses.includes(stepId)) {
      return "completed";
    }
    
    const currentIndex = workflowSteps.indexOf(currentStatus);
    const stepIndex = workflowSteps.indexOf(stepId);
    
    if (stepIndex < currentIndex) {
      return "skipped";
    }
    
    return "pending";
  };

  const getStepIcon = (stepId: string, status: string) => {
    if (status === "completed") {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    
    if (status === "current") {
      if (stepId === "rejected") {
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      }
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    }
    
    if (stepId === "info_requested") {
      return <FileText className="h-5 w-5 text-gray-400 group-hover:text-blue-400" />;
    }
    
    return <Clock className="h-5 w-5 text-gray-400" />;
  };

  return (
    <div className="relative">
      <div className="flex flex-col space-y-6 md:space-y-8">
        {workflowSteps.map((stepId) => {
          if (stepId === "rejected" && currentStatus !== "rejected") {
            return null; // Ne pas afficher l'étape rejetée sauf si c'est le statut actuel
          }
          
          const status = getStepStatus(stepId);
          const stepInfo = OFFER_STATUSES[stepId] || { id: stepId, label: stepId, description: "" };
          
          const isClickable = onStatusChange !== undefined && status !== "current";
          
          return (
            <div 
              key={stepId}
              className={`flex items-start space-x-3 ${
                isClickable ? "cursor-pointer group" : ""
              } ${
                status === "current" ? "bg-blue-50 p-2 -mx-2 rounded-md" : ""
              }`}
              onClick={() => isClickable && handleStepClick(stepId)}
            >
              <div className={`mt-0.5 flex-shrink-0 ${
                status === "current" ? "animate-pulse" : ""
              }`}>
                {getStepIcon(stepId, status)}
              </div>
              <div>
                <h3 className={`font-medium ${
                  status === "current" ? "text-blue-700" :
                  status === "completed" ? "text-green-700" :
                  "text-gray-700 group-hover:text-blue-600"
                }`}>
                  {stepInfo.label}
                </h3>
                <p className={`text-sm ${
                  status === "current" ? "text-blue-600" :
                  status === "completed" ? "text-green-600" :
                  "text-gray-500"
                }`}>
                  {stepInfo.description}
                </p>
                
                {status === "current" && lastUpdated && (
                  <p className="text-xs text-blue-500 mt-1">
                    Mise à jour {formatDistanceToNow(new Date(lastUpdated), { addSuffix: true, locale: fr })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OfferWorkflowVisualizer;
