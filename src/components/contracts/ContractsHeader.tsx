
import React from "react";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ContractsHeaderProps {
  isRefreshing: boolean;
  loading: boolean;
  isDeleting: boolean;
  onRefresh: () => void;
}

const ContractsHeader: React.FC<ContractsHeaderProps> = ({ 
  isRefreshing, 
  loading, 
  isDeleting, 
  onRefresh 
}) => {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="flex items-center">
          <FileText className="h-6 w-6 mr-2" />
          <h1 className="text-2xl font-bold">Gestion des contrats</h1>
        </div>
        <p className="text-muted-foreground mt-1">
          Gérez vos contrats et suivez leur progression
        </p>
      </div>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onRefresh}
        disabled={isRefreshing || loading || isDeleting}
      >
        {isRefreshing ? (
          <span className="flex items-center">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Actualisation...
          </span>
        ) : (
          <>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </>
        )}
      </Button>
    </div>
  );
};

export default ContractsHeader;
