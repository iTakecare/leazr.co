import React from "react";
import { Check } from "lucide-react";

interface StepperProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export const StepperProgress: React.FC<StepperProgressProps> = ({
  currentStep,
  totalSteps,
  stepLabels,
}) => {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div key={index} className="flex flex-col items-center">
              <div className="flex items-center">
                {/* Step circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300 ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    stepNumber
                  )}
                </div>
                
                {/* Connector line */}
                {index < totalSteps - 1 && (
                  <div
                    className={`hidden sm:block w-20 h-0.5 ml-2 transition-colors duration-300 ${
                      isCompleted ? "bg-primary" : "bg-muted"
                    }`}
                  />
                )}
              </div>
              
              {/* Step label */}
              <span
                className={`mt-2 text-xs font-medium text-center transition-colors duration-300 ${
                  isCurrent ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Progress bar for mobile */}
      <div className="mt-4 sm:hidden">
        <div className="bg-muted rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};