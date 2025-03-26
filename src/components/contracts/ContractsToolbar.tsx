
import React from "react";
import { Filter, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContractsFilter from "@/components/contracts/ContractsFilter";
import ContractsSearch from "@/components/contracts/ContractsSearch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ContractViewMode } from "@/hooks/contracts/useContractView";

interface ContractsToolbarProps {
  activeStatus: string;
  onStatusChange: (status: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  viewMode: ContractViewMode;
  setViewMode: (mode: ContractViewMode) => void;
  includeCompleted: boolean;
  setIncludeCompleted: (value: boolean) => void;
}

const ContractsToolbar: React.FC<ContractsToolbarProps> = ({
  activeStatus,
  onStatusChange,
  searchTerm,
  onSearchChange,
  viewMode,
  setViewMode,
  includeCompleted,
  setIncludeCompleted
}) => {
  return (
    <div className="mb-6 flex flex-col sm:flex-row justify-between gap-4">
      <ContractsFilter
        activeStatus={activeStatus}
        onStatusChange={onStatusChange}
      />
      
      <div className="flex items-center gap-2">
        <ContractsSearch 
          value={searchTerm} 
          onChange={onSearchChange} 
        />
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-between p-2">
              <Label htmlFor="show-completed" className="flex items-center cursor-pointer">
                <span>Inclure les contrats terminés</span>
              </Label>
              <Switch 
                id="show-completed"
                checked={includeCompleted}
                onCheckedChange={setIncludeCompleted}
              />
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <div className="flex items-center border rounded-md overflow-hidden">
          <Button 
            variant={viewMode === 'list' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('list')} 
            className="rounded-none px-3"
          >
            <List className="h-4 w-4 mr-2" />
            Liste
          </Button>
          <Button 
            variant={viewMode === 'kanban' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setViewMode('kanban')} 
            className="rounded-none px-3"
          >
            <Grid className="h-4 w-4 mr-2" />
            Kanban
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ContractsToolbar;
