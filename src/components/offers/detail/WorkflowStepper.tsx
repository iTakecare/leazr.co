
import React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Clock } from "lucide-react";

interface WorkflowStepperProps {
  currentStatus: string;
  onStatusChange?: (status: string) => void;
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({ 
  currentStatus, 
  onStatusChange 
}) => {
  const steps = [
    { key: 'draft', label: 'Brouillon', icon: Circle },
    { key: 'sent', label: 'Offre envoyée', icon: Clock },
    { key: 'internal_review', label: 'Analyse interne', icon: Clock },
    { key: 'leaser_review', label: 'Analyse Leaser', icon: Clock },
    { key: 'validated', label: 'Offre validée', icon: CheckCircle }
  ];

  const getCurrentStepIndex = () => {
    return steps.findIndex(step => step.key === currentStatus);
  };

  const currentIndex = getCurrentStepIndex();

  return (
    <div className="w-full bg-white rounded-lg border p-6 mb-6">
      <h3 className="text-lg font-semibold mb-4">Progression de l'offre</h3>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1">
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
                  <Icon className="w-5 h-5" />
                </div>
                {index < steps.length - 1 && (
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
                  {step.label}
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
