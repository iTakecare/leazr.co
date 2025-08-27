
import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Clock } from "lucide-react";
import { useWorkflowForOfferType } from "@/hooks/workflows/useWorkflows";
import { useAuth } from "@/context/AuthContext";
import type { OfferType } from "@/types/workflow";

interface WorkflowStepperProps {
  currentStatus: string;
  onStatusChange?: (status: string) => void;
  offerType?: OfferType;
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ 
  currentStatus, 
  onStatusChange,
  offerType = 'standard'
}) => {
  const { user } = useAuth();
  const { steps: workflowSteps, loading } = useWorkflowForOfferType(
    user?.user_metadata?.company_id,
    offerType
  );

  if (loading || !workflowSteps?.length) {
    return (
      <div className="w-full bg-white rounded-lg border p-6 mb-6">
        <div className="animate-pulse h-20 bg-gray-100 rounded"></div>
      </div>
    );
  }

  const getCurrentStepIndex = () => {
    return workflowSteps.findIndex(step => step.step_key === currentStatus);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="w-full bg-white rounded-lg border p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Progression de l'offre</h3>
      <div className="flex items-center justify-between">
        {workflowSteps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={step.step_key} className="flex flex-col items-center flex-1">
              <div className="flex items-center w-full">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isActive ? (
                    <Clock className="w-5 h-5" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </div>
                {index < workflowSteps.length - 1 && (
                  <div 
                    className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
              <div className="mt-2 text-center">
                <Badge 
                  variant={isActive ? 'default' : isCompleted ? 'secondary' : 'outline'}
                  className="text-xs"
                >
                  {step.step_label}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowStepper;
