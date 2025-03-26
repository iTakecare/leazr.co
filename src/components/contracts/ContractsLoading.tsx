
import React from 'react';

const ContractsLoading: React.FC = () => {
  return (
    <div className="py-8 flex justify-center items-center">
      <div className="text-center">
        <div className="animate-spin mb-4 h-12 w-12 border-t-2 border-b-2 border-primary mx-auto rounded-full"></div>
        <p className="text-muted-foreground">Chargement des contrats...</p>
      </div>
    </div>
  );
};

export default ContractsLoading;
