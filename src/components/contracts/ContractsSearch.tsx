
import React from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ContractsSearchProps {
  value: string;
  onChange: (value: string) => void;
}

const ContractsSearch: React.FC<ContractsSearchProps> = ({ value, onChange }) => {
  return (
    <div className="relative">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Rechercher un contrat..."
        className="pl-8 w-[250px]"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
};

export default ContractsSearch;
