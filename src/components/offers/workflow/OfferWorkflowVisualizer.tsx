
import React from "react";
import { format } from "date-fns";
import { Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { OFFER_STATUSES } from "../OfferStatusBadge";
import { KANBAN_COLUMNS } from "../kanban/kanbanConfig";

interface OfferWorkflowVisualizerProps {
  currentStatus: string;
  completedStatuses: string[];
  onStatusChange?: (newStatus: string) => void;
  lastUpdated?: string | null;
  completionPercentage?: number;
}

const OfferWorkflowVisualizer: React.FC<OfferWorkflowVisualizerProps> = ({
  currentStatus,
  completedStatuses,
  onStatusChange,
  lastUpdated,
  completionPercentage = 0,
}) => {
  // Filtrer les colonnes pour exclure "rejected" du workflow normal
  const workflowSteps = KANBAN_COLUMNS.filter(
    (column) => column.id !== OFFER_STATUSES.REJECTED.id
  );

  // Déterminer le pourcentage de progression
  const calculateCompletionPercentage = () => {
    if (completionPercentage > 0) return completionPercentage;
    
    const totalSteps = workflowSteps.length;
    const currentStepIndex = workflowSteps.findIndex(step => step.id === currentStatus);
    
    if (currentStepIndex === -1) return 0;
    return Math.round(((currentStepIndex + 1) / totalSteps) * 100);
  };

  const isCompleted = (stepId: string) => {
    return completedStatuses.includes(stepId) || stepId === currentStatus;
  };

  const isActive = (stepId: string) => {
    return stepId === currentStatus;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Processus de validation</h3>
        {lastUpdated && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-1" />
            <span>Dernière mise à jour: {format(new Date(lastUpdated), "dd/MM/yyyy, HH:mm")}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-6 gap-4">
        {workflowSteps.map((step, index) => {
          const StepIcon = step.icon;
          const completed = isCompleted(step.id);
          const active = isActive(step.id);
          
          return (
            <div 
              key={step.id} 
              className="flex flex-col items-center"
              onClick={() => onStatusChange && onStatusChange(step.id)}
            >
              <div 
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                  completed ? step.color : "bg-gray-100",
                  onStatusChange && "cursor-pointer hover:opacity-80"
                )}
              >
                {completed ? (
                  <Check className={cn("h-8 w-8", step.textColor)} />
                ) : (
                  <StepIcon className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <span className={cn(
                "mt-2 text-center text-sm", 
                active ? "font-semibold" : "text-muted-foreground"
              )}>
                {step.title}
              </span>
            </div>
          );
        })}
      </div>

      <div className="relative pt-1">
        <div className="flex mb-2 items-center justify-between">
          <div>
            <span className="text-xs font-semibold inline-block text-primary">
              {calculateCompletionPercentage()}%
            </span>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold inline-block text-primary">
              Complété
            </span>
          </div>
        </div>
        <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
          <div 
            style={{ width: `${calculateCompletionPercentage()}%` }} 
            className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
          ></div>
        </div>
      </div>
    </div>
  );
};

export default OfferWorkflowVisualizer;
