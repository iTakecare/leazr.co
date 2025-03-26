
import { useContractsList } from './useContractsList';
import { useContractsFilter } from './useContractsFilter';
import { useContractActions } from './useContractActions';
import { useContractView } from './useContractView';

export const useContracts = () => {
  const {
    contracts,
    loading,
    loadingError,
    isRefreshing,
    includeCompleted,
    setIncludeCompleted,
    fetchContracts
  } = useContractsList();

  const {
    filteredContracts,
    activeStatusFilter,
    setActiveStatusFilter,
    searchTerm,
    setSearchTerm
  } = useContractsFilter(contracts);

  const {
    isUpdatingStatus,
    isDeleting,
    deleteInProgress,
    handleUpdateContractStatus,
    handleAddTrackingInfo,
    handleDeleteContract
  } = useContractActions(fetchContracts);

  const { viewMode, setViewMode } = useContractView();

  return {
    // État des contrats
    contracts,
    filteredContracts,
    loading,
    loadingError,
    isRefreshing,
    
    // État des filtres
    searchTerm,
    setSearchTerm,
    activeStatusFilter,
    setActiveStatusFilter,
    
    // État de l'affichage
    viewMode,
    setViewMode,
    includeCompleted,
    setIncludeCompleted,
    
    // État des actions
    isUpdatingStatus,
    isDeleting,
    deleteInProgress,
    
    // Actions
    fetchContracts,
    handleUpdateContractStatus,
    handleAddTrackingInfo,
    handleDeleteContract
  };
};

export * from './useContractsList';
export * from './useContractsFilter';
export * from './useContractActions';
export * from './useContractView';
