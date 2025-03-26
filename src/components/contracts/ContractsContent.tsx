
import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Contract } from '@/services/contracts';
import ContractsKanban from '@/components/contracts/ContractsKanban';
import ContractsTable from '@/components/contracts/ContractsTable';

interface ContractsContentProps {
  viewMode: 'list' | 'kanban';
  filteredContracts: Contract[];
  loadingError: string | null;
  isRefreshing: boolean;
  isDeleting: boolean;
  isUpdatingStatus: boolean;
  deleteInProgress: string | null;
  onStatusChange: (contractId: string, newStatus: string, reason?: string) => Promise<void>;
  onAddTrackingInfo: (contractId: string, trackingNumber: string, estimatedDelivery?: string, carrier?: string) => Promise<void>;
  onDeleteContract: (contractId: string) => Promise<void>;
}

const ContractsContent: React.FC<ContractsContentProps> = ({
  viewMode,
  filteredContracts,
  loadingError,
  isRefreshing,
  isDeleting,
  isUpdatingStatus,
  deleteInProgress,
  onStatusChange,
  onAddTrackingInfo,
  onDeleteContract
}) => {
  const scrollContainer = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainer.current) {
      scrollContainer.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  return (
    <div className={
      (isRefreshing || isDeleting) ? "opacity-50 pointer-events-none relative" : "relative"
    }>
      {loadingError && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <p className="text-sm">{loadingError}</p>
        </div>
      )}
      
      {viewMode === 'kanban' ? (
        <>
          <div className="flex justify-between items-center mb-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={scrollLeft}
              className="rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="icon" 
              onClick={scrollRight}
              className="rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div ref={scrollContainer} className="overflow-hidden">
            <ContractsKanban 
              contracts={filteredContracts}
              onStatusChange={onStatusChange}
              onAddTrackingInfo={onAddTrackingInfo}
              isUpdatingStatus={isUpdatingStatus}
            />
          </div>
        </>
      ) : (
        <ContractsTable 
          contracts={filteredContracts}
          onStatusChange={onStatusChange}
          onAddTrackingInfo={onAddTrackingInfo}
          onDeleteContract={onDeleteContract}
          isUpdatingStatus={isUpdatingStatus}
          isDeleting={isDeleting}
          deleteInProgress={deleteInProgress}
        />
      )}
      
      {(isRefreshing || isDeleting) && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 backdrop-blur-sm">
          <div className="flex flex-col items-center">
            <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full"></div>
            <p className="mt-4 font-medium text-sm">
              {isDeleting ? "Suppression en cours..." : "Actualisation..."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractsContent;
