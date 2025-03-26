
import React from "react";

const LoadingState: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement de votre offre...</p>
      </div>
    </div>
  );
};

export default LoadingState;
