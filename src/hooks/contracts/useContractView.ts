
import { useState } from "react";

export type ContractViewMode = 'kanban' | 'list';

export const useContractView = () => {
  const [viewMode, setViewMode] = useState<ContractViewMode>('list');

  return {
    viewMode,
    setViewMode
  };
};
