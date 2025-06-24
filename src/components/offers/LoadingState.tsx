
import React from "react";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  message?: string;
  detail?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ 
  message = "Chargement de votre offre...",
  detail 
}) => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
        <p className="mt-4 text-gray-600 font-medium">{message}</p>
        {detail && (
          <p className="mt-2 text-sm text-gray-500">{detail}</p>
        )}
      </div>
    </div>
  );
};

export default LoadingState;
