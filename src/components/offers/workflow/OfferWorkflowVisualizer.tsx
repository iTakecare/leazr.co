
import React from "react";
import { format } from "date-fns";
import { Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkflowForOfferType } from "@/hooks/workflows/useWorkflows";
import { useAuth } from "@/context/AuthContext";
import type { OfferType } from "@/types/workflow";

interface OfferWorkflowVisualizerProps {
  currentStatus: string;
  completedStatuses: string[];
  onStatusChange?: (newStatus: string) => void;
  lastUpdated?: string | null;
  completionPercentage?: number;
  offerType?: OfferType;
}

const OfferWorkflowVisualizer: React.FC<OfferWorkflowVisualizerProps> = ({
  currentStatus,
  completedStatuses,
  onStatusChange,
  lastUpdated,
  completionPercentage = 0,
  offerType = 'client_request',
}) => {
  const { user } = useAuth();
  const { steps: workflowSteps, loading } = useWorkflowForOfferType(
    user?.user_metadata?.company_id,
    offerType
  );

  if (loading || !workflowSteps?.length) {
    return <div className="animate-pulse h-32 bg-gray-100 rounded"></div>;
  }

  // Déterminer le pourcentage de progression
  const calculateCompletionPercentage = () => {
    if (completionPercentage > 0) return completionPercentage;
    
    const totalSteps = workflowSteps.length;
    const currentStepIndex = workflowSteps.findIndex(step => step.step_key === currentStatus);
    
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

      <div className={`grid gap-4`} style={{ gridTemplateColumns: `repeat(${workflowSteps.length}, 1fr)` }}>
        {workflowSteps.map((step, index) => {
          const completed = isCompleted(step.step_key);
          const active = isActive(step.step_key);
          
          return (
            <div 
              key={step.step_key} 
              className="flex flex-col items-center"
              onClick={() => onStatusChange && onStatusChange(step.step_key)}
            >
              <div 
                className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center transition-all border-2",
                  completed 
                    ? "bg-green-500 border-green-500 text-white" 
                    : active 
                      ? "bg-blue-500 border-blue-500 text-white"
                      : "bg-gray-100 border-gray-300 text-gray-400",
                  onStatusChange && "cursor-pointer hover:opacity-80"
                )}
              >
                {completed ? (
                  <Check className="h-8 w-8" />
                ) : (
                  <Clock className="h-8 w-8" />
                )}
              </div>
              <span className={cn(
                "mt-2 text-center text-sm", 
                active ? "font-semibold" : "text-muted-foreground"
              )}>
                {step.step_label}
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
